import { writeFile, copyFile, rm, mkdir, readFile, appendFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { createHash, randomUUID } from "crypto";
import { exec } from "child_process";
import { promisify } from "util";
import { prisma } from "./prisma";
import { applyLayoutPlaceholders, type OutputSettings } from "./latexLayout";
import {
  buildSongContentForPdf,
  type SongPdfPipelineMetadata,
} from "../utils/songPdfPipelineSafety";

const execAsync = promisify(exec);

const PROJECT_ROOT = process.cwd();
const SONGMAKER_CLI = join(PROJECT_ROOT, "bin", "songmaker-cli");
const LATEX_DIR = join(PROJECT_ROOT, "src/lib/server/latex");
const PDF_STORAGE_DIR = join(PROJECT_ROOT, "storage", "pdfs");

/** Debug session NDJSON (local `.cursor/…` + optional ingest); also `storage/pdfs` copy for remote scp. */
const DEBUG_SESSION = "9e9858";
const DEBUG_LOG_REL = join(".cursor", `debug-${DEBUG_SESSION}.log`);
const DEBUG_STORAGE_REL = join("storage", "pdfs", `latex-debug-${DEBUG_SESSION}.ndjson`);

function sha256String(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

async function sha256File(path: string): Promise<string | null> {
  try {
    const buf = await readFile(path);
    return createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}

async function agentDebugLog(payload: {
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
  runId?: string;
}): Promise<void> {
  const body = {
    sessionId: DEBUG_SESSION,
    timestamp: Date.now(),
    ...payload,
  };
  const line = `${JSON.stringify(body)}\n`;
  // #region agent log
  try {
    await mkdir(join(PROJECT_ROOT, ".cursor"), { recursive: true });
    await appendFile(join(PROJECT_ROOT, DEBUG_LOG_REL), line, "utf-8");
  } catch {
    /* ignore local log failures */
  }
  try {
    await mkdir(join(PROJECT_ROOT, "storage", "pdfs"), { recursive: true });
    await appendFile(join(PROJECT_ROOT, DEBUG_STORAGE_REL), line, "utf-8");
  } catch {
    /* ignore */
  }
  fetch("http://127.0.0.1:7324/ingest/8a12abdf-b0bd-4ef7-8a8e-38d4063a75ce", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": DEBUG_SESSION,
    },
    body: JSON.stringify(body),
  }).catch(() => {});
  // #endregion
}

export type { OutputSettings };

const MODE_TEMPLATE_MAP: Record<OutputSettings["mode"], string> = {
  chorded: "chorded.tex",
  "text-only": "text-only.tex",
  overhead: "overhead.tex",
};

function parseOutputSettings(json: string): OutputSettings {
  const defaults: OutputSettings = {
    mode: "chorded",
    fontSize: "medium",
    paperSize: "a4",
  };
  try {
    const parsed = JSON.parse(json || "{}") as Partial<OutputSettings>;
    return {
      mode: parsed.mode ?? defaults.mode,
      fontSize: parsed.fontSize ?? defaults.fontSize,
      paperSize: parsed.paperSize ?? defaults.paperSize,
    };
  } catch {
    return defaults;
  }
}

async function ensurePdfStorageDir(): Promise<string> {
  if (!existsSync(PDF_STORAGE_DIR)) {
    await mkdir(PDF_STORAGE_DIR, { recursive: true });
  }
  return PDF_STORAGE_DIR;
}

async function createTempDir(): Promise<string> {
  const tmpDir = join(PROJECT_ROOT, "tmp", randomUUID());
  await mkdir(tmpDir, { recursive: true });
  return tmpDir;
}

async function ensureOutputDir(): Promise<string> {
  const outputDir = join(PROJECT_ROOT, "tmp", "output");
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }
  return outputDir;
}

async function setupLatexFiles(
  tempDir: string,
  settings: OutputSettings,
): Promise<void> {
  const templateFile = MODE_TEMPLATE_MAP[settings.mode];
  await copyFile(join(LATEX_DIR, "songs.sty"), join(tempDir, "songs.sty"));

  // Chorded / text-only: scrbook `layout.tex` + shared song body + hyperref/TOC fragment.
  if (settings.mode === "chorded" || settings.mode === "text-only") {
    for (const file of ["font-body.tex", "songbook-hyper-toc.tex"] as const) {
      await copyFile(join(LATEX_DIR, file), join(tempDir, file));
    }
    const layoutContent = await readFile(join(LATEX_DIR, "layout.tex"), "utf-8");
    const updatedLayout = applyLayoutPlaceholders(layoutContent, settings);
    await writeFile(join(tempDir, "layout.tex"), updatedLayout, "utf-8");
  }

  // Overhead: self-contained article + geometry (legacy Liedermappe); only `songs.sty` beside main.tex.

  await copyFile(join(LATEX_DIR, templateFile), join(tempDir, "main.tex"));
}

async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    await rm(tempDir, { recursive: true, force: true });
  } catch {}
}

async function convertSongToLatex(
  title: string,
  content: string,
  author: string | null,
  metadata: string,
  tempDir: string,
): Promise<string> {
  const parsed = JSON.parse(metadata || "{}") as SongPdfPipelineMetadata;
  const sngContent = buildSongContentForPdf(title, content, author, parsed);

  const sngPath = join(tempDir, `${randomUUID()}.sng`);
  await writeFile(sngPath, sngContent, "utf-8");

  await execAsync(`${SONGMAKER_CLI} ${sngPath}`, {
    cwd: tempDir,
  });

  const texPath = sngPath.replace(".sng", ".tex");
  const latex = await readFile(texPath, "utf-8");
  return latex;
}

export interface SongbookTocSongEntry {
  order: number;
  songVersion: {
    title: string;
  };
}

/**
 * Escape text embedded in LaTeX so titles survive in \songtocline arguments.
 */
export function escapeLatexForSongbookToc(text: string): string {
  let result = "";
  for (const ch of text) {
    switch (ch) {
      case "\\":
        result += "\\textbackslash{}";
        break;
      case "&":
        result += "\\&";
        break;
      case "%":
        result += "\\%";
        break;
      case "$":
        result += "\\$";
        break;
      case "#":
        result += "\\#";
        break;
      case "_":
        result += "\\_";
        break;
      case "{":
        result += "\\{";
        break;
      case "}":
        result += "\\}";
        break;
      case "~":
        result += "\\textasciitilde{}";
        break;
      case "^":
        result += "\\textasciicircum{}";
        break;
      default:
        result += ch;
    }
  }
  return result;
}

/**
 * End-of-book TOC matching songs title-index layout (\idxtitlefont, dot leaders,
 * song number). Anchors are song1-N (see \songtarget in songs.sty); songbook-hyper-toc.tex \songtocline
 * links to #1.1 because hyperref’s corrected PDF dest for each song is the .1 suffix.
 */
export function buildSongbookTocLatex(songs: SongbookTocSongEntry[]): string {
  const tocLines = [
    "\\clearpage",
    "\\songbooktocheading",
    "\\vspace{0.5em}",
  ];

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    const songNumber = i + 1;
    const anchor = `song1-${songNumber}`;
    const escapedTitle = escapeLatexForSongbookToc(song.songVersion.title);
    tocLines.push(`\\songtocline{${anchor}}{${escapedTitle}}{${songNumber}}`);
  }

  return tocLines.join("\n");
}

function generateTableOfContents(songs: SongbookTocSongEntry[]): string {
  return buildSongbookTocLatex(songs);
}

const SONGBOOK_PDF_VERSION_INCLUDE = {
  orderBy: { order: "asc" as const },
  include: {
    songVersion: {
      include: {
        song: true,
      },
    },
  },
};

/**
 * Writes the exact LaTeX tree used for PDF generation (main.tex, layout, fragments,
 * generated-songs.tex, table-of-contents.tex, songs.sty) into `outDir` without running pdflatex.
 * Use for cross-host pdflatex comparison: same bytes → any PDF difference is TeX engine/fonts only.
 */
export async function exportSongbookLatexWorkspace(
  songbookId: string,
  outDir: string,
  versionId?: string,
): Promise<{
  songbookId: string;
  versionId: string;
  songCount: number;
  mode: OutputSettings["mode"];
}> {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const songbook = await prisma.songbook.findUnique({
    where: { id: songbookId },
    include: {
      versions: {
        where: versionId ? { id: versionId } : {},
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          songs: SONGBOOK_PDF_VERSION_INCLUDE,
        },
      },
    },
  });

  if (!songbook || songbook.versions.length === 0) {
    throw new Error("Songbook or version not found");
  }

  const version = songbook.versions[0];

  if (version.songs.length === 0) {
    throw new Error("Songbook has no songs");
  }

  const outputSettings = parseOutputSettings(songbook.outputSettings);
  await setupLatexFiles(outDir, outputSettings);

  const latexSongs: string[] = [];
  for (const songEntry of version.songs) {
    const latex = await convertSongToLatex(
      songEntry.songVersion.title,
      songEntry.songVersion.content,
      songEntry.songVersion.author,
      songEntry.songVersion.metadata,
      outDir,
    );
    latexSongs.push(latex);
  }

  await writeFile(
    join(outDir, "generated-songs.tex"),
    latexSongs.join("\n\n"),
    "utf-8",
  );

  await writeFile(
    join(outDir, "table-of-contents.tex"),
    generateTableOfContents(version.songs),
    "utf-8",
  );

  const manifest = [
    `songbookId=${songbookId}`,
    `versionId=${version.id}`,
    `songCount=${version.songs.length}`,
    `mode=${outputSettings.mode}`,
    `exportedAt=${new Date().toISOString()}`,
    `combinedSongsSha256=${sha256String(latexSongs.join("\n\n"))}`,
  ].join("\n");
  await writeFile(join(outDir, "EXPORT_MANIFEST.txt"), manifest, "utf-8");

  return {
    songbookId,
    versionId: version.id,
    songCount: version.songs.length,
    mode: outputSettings.mode,
  };
}

export async function generateSongbookPdf(
  songbookId: string,
  versionId?: string,
): Promise<{ pdfPath: string; logPath: string }> {
  const songbook = await prisma.songbook.findUnique({
    where: { id: songbookId },
    include: {
      versions: {
        where: versionId ? { id: versionId } : {},
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          songs: SONGBOOK_PDF_VERSION_INCLUDE,
        },
      },
    },
  });

  if (!songbook || songbook.versions.length === 0) {
    throw new Error("Songbook or version not found");
  }

  const version = songbook.versions[0];

  if (version.songs.length === 0) {
    throw new Error("Songbook has no songs");
  }

  const storageDir = await ensurePdfStorageDir();
  const tempDir = await createTempDir();

  const outputSettings = parseOutputSettings(songbook.outputSettings);

  // #region agent log
  await agentDebugLog({
    hypothesisId: "H-env",
    location: "songbookPdf.ts:generateSongbookPdf:entry",
    message: "PDF build environment",
    data: {
      nodeEnv: process.env.NODE_ENV ?? null,
      cwd: process.cwd(),
      songbookId,
      versionId: versionId ?? null,
      songmakerPath: SONGMAKER_CLI,
      songmakerExists: existsSync(SONGMAKER_CLI),
      latexDir: LATEX_DIR,
    },
  });
  await agentDebugLog({
    hypothesisId: "H4-settings",
    location: "songbookPdf.ts:generateSongbookPdf:outputSettings",
    message: "Songbook output settings",
    data: {
      outputSettings,
      rawOutputSettingsHead: (songbook.outputSettings ?? "").slice(0, 400),
    },
  });
  const songmakerSha256 = await sha256File(SONGMAKER_CLI);
  const templateNames =
    outputSettings.mode === "overhead"
      ? (["overhead.tex", "songs.sty"] as const)
      : ([
          MODE_TEMPLATE_MAP[outputSettings.mode],
          "layout.tex",
          "font-body.tex",
          "songbook-hyper-toc.tex",
          "songs.sty",
        ] as const);
  const templateSha256: Record<string, string | null> = {};
  for (const name of templateNames) {
    templateSha256[name] = await sha256File(join(LATEX_DIR, name));
  }
  let pdflatexVersionLine = "unknown";
  try {
    const { stdout } = await execAsync("pdflatex --version", { maxBuffer: 64 * 1024 });
    pdflatexVersionLine = stdout.split("\n")[0]?.trim() ?? stdout.slice(0, 200);
  } catch (e) {
    pdflatexVersionLine = `error:${e instanceof Error ? e.message : String(e)}`;
  }
  await agentDebugLog({
    hypothesisId: "H2-songmaker",
    location: "songbookPdf.ts:generateSongbookPdf:toolchain",
    message: "songmaker binary + template shas",
    data: { songmakerSha256, templateSha256, pdflatexVersionLine },
  });
  // #endregion

  try {
    await setupLatexFiles(tempDir, outputSettings);

    const latexSongs: string[] = [];
    const perSongDebug: {
      order: number;
      title: string;
      sngBodySha256: string;
      latexSha256: string;
      latexLen: number;
      head800: string;
    }[] = [];

    for (const songEntry of version.songs) {
      const parsedMeta = JSON.parse(songEntry.songVersion.metadata || "{}") as SongPdfPipelineMetadata;
      const sngForPdf = buildSongContentForPdf(
        songEntry.songVersion.title,
        songEntry.songVersion.content,
        songEntry.songVersion.author,
        parsedMeta,
      );
      const latex = await convertSongToLatex(
        songEntry.songVersion.title,
        songEntry.songVersion.content,
        songEntry.songVersion.author,
        songEntry.songVersion.metadata,
        tempDir,
      );
      latexSongs.push(latex);
      const bodyAfterSep = sngForPdf.includes("***\n")
        ? sngForPdf.split("***\n").slice(1).join("***\n")
        : sngForPdf;
      perSongDebug.push({
        order: songEntry.order,
        title: songEntry.songVersion.title,
        sngBodySha256: sha256String(bodyAfterSep),
        latexSha256: sha256String(latex),
        latexLen: latex.length,
        head800: latex.slice(0, 800),
      });
    }

    // #region agent log
    await agentDebugLog({
      hypothesisId: "H1-content-latex",
      location: "songbookPdf.ts:generateSongbookPdf:perSong",
      message: "Per-song sng body + songmaker latex digest",
      data: { perSongDebug },
    });
    // #endregion

    const combinedLatex = latexSongs.join("\n\n");
    await writeFile(
      join(tempDir, "generated-songs.tex"),
      combinedLatex,
      "utf-8",
    );

    const tocContent = generateTableOfContents(version.songs);
    await writeFile(
      join(tempDir, "table-of-contents.tex"),
      tocContent,
      "utf-8",
    );

    const mainTexWritten = await readFile(join(tempDir, "main.tex"), "utf-8");
    const layoutWritten =
      outputSettings.mode === "chorded" || outputSettings.mode === "text-only"
        ? await readFile(join(tempDir, "layout.tex"), "utf-8")
        : "";

    // #region agent log
    await agentDebugLog({
      hypothesisId: "H3-effective-tex",
      location: "songbookPdf.ts:generateSongbookPdf:assembledSources",
      message: "Effective main.tex + layout + combined songs head",
      data: {
        mainTexSha256: sha256String(mainTexWritten),
        layoutTexSha256: layoutWritten ? sha256String(layoutWritten) : null,
        combinedSongsSha256: sha256String(combinedLatex),
        mainTexHead: mainTexWritten.slice(0, 600),
        layoutTexHead: layoutWritten.slice(0, 400),
        combinedSongsHead2000: combinedLatex.slice(0, 2000),
      },
    });
    // #endregion

    const texPath = join(tempDir, "main.tex");

    await execAsync(
      `pdflatex -interaction=batchmode -halt-on-error -file-line-error -output-directory=${tempDir} ${texPath}`,
      { cwd: tempDir },
    );

    await execAsync(
      `pdflatex -interaction=batchmode -halt-on-error -file-line-error -output-directory=${tempDir} ${texPath}`,
      { cwd: tempDir },
    );

    const pdfPath = join(storageDir, `${version.id}.pdf`);
    const logPath = join(storageDir, `${version.id}.log`);

    await copyFile(join(tempDir, "main.pdf"), pdfPath);
    await copyFile(join(tempDir, "main.log"), logPath);

    // #region agent log
    let mainLogTail = "";
    try {
      const logFull = await readFile(join(tempDir, "main.log"), "utf-8");
      mainLogTail = logFull.slice(-2500);
    } catch {
      mainLogTail = "(unreadable)";
    }
    await agentDebugLog({
      hypothesisId: "H5-pdflatex-log",
      location: "songbookPdf.ts:generateSongbookPdf:success",
      message: "pdflatex main.log tail",
      data: { mainLogTail },
    });
    // #endregion

    await prisma.songbookVersion.update({
      where: { id: version.id },
      data: {
        pdfPath,
        pdfLogPath: logPath,
        pdfGeneratedAt: new Date(),
      },
    });

    return { pdfPath, logPath };
  } catch (error) {
    // #region agent log
    await agentDebugLog({
      hypothesisId: "H-err",
      location: "songbookPdf.ts:generateSongbookPdf:catch",
      message: "PDF build failed",
      data: {
        err: error instanceof Error ? error.message : String(error),
      },
    });
    // #endregion
    const logPath = join(storageDir, `${version.id}.log`);
    const tempLogPath = join(tempDir, "main.log");
    if (existsSync(tempLogPath)) {
      await copyFile(tempLogPath, logPath);
    }
    await prisma.songbookVersion.update({
      where: { id: version.id },
      data: {
        pdfLogPath: logPath,
        pdfGeneratedAt: new Date(),
      },
    });
    throw error;
  } finally {
    await cleanupTempDir(tempDir);
  }
}
