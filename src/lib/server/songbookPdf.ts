import { writeFile, copyFile, rm, mkdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { exec } from "child_process";
import { promisify } from "util";
import { prisma } from "$lib/server/prisma";
import {
  applyLayoutPlaceholders,
  type OutputSettings,
} from "$lib/server/latexLayout";
import {
  buildSongContentForPdf,
  type SongPdfPipelineMetadata,
} from "$lib/utils/songPdfPipelineSafety";

const execAsync = promisify(exec);

const PROJECT_ROOT = process.cwd();
const SONGMAKER_CLI = join(PROJECT_ROOT, "bin", "songmaker-cli");
const LATEX_DIR = join(PROJECT_ROOT, "src/lib/server/latex");
const PDF_STORAGE_DIR = join(PROJECT_ROOT, "storage", "pdfs");

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
  const commonFiles = ["font.tex", "songs.sty"];
  for (const file of commonFiles) {
    await copyFile(join(LATEX_DIR, file), join(tempDir, file));
  }

  const layoutContent = await readFile(join(LATEX_DIR, "layout.tex"), "utf-8");
  const updatedLayout = applyLayoutPlaceholders(layoutContent, settings);
  await writeFile(join(tempDir, "layout.tex"), updatedLayout, "utf-8");

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
 * song number). Anchors are song1-N (see \songtarget in songs.sty); font.tex \songtocline
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
          songs: {
            orderBy: { order: "asc" },
            include: {
              songVersion: {
                include: {
                  song: true,
                },
              },
            },
          },
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

  try {
    await setupLatexFiles(tempDir, outputSettings);

    const latexSongs: string[] = [];
    for (const songEntry of version.songs) {
      const latex = await convertSongToLatex(
        songEntry.songVersion.title,
        songEntry.songVersion.content,
        songEntry.songVersion.author,
        songEntry.songVersion.metadata,
        tempDir,
      );
      latexSongs.push(latex);
    }

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
