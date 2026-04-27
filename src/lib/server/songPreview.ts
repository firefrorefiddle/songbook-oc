import { writeFile, readFile, unlink, mkdir, copyFile, rm } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { exec } from "child_process";
import { promisify } from "util";
import {
  applyLayoutPlaceholders,
  PREVIEW_OUTPUT_SETTINGS,
} from "$lib/server/latexLayout";
import { extractPdflatexUserMessage } from "$lib/server/latexLog";
import {
  DEFAULT_SONG_LATEX_STYLE,
  songmakerUsesSongsStyFlag,
  type SongLatexStyle,
} from "$lib/songLatexStyle";

const execAsync = promisify(exec);

const PROJECT_ROOT = process.cwd();
const SONGMAKER_CLI = join(PROJECT_ROOT, "bin", "songmaker-cli");
const LATEX_DIR = join(PROJECT_ROOT, "src/lib/server/latex");

/** Single basename in the temp dir so we can swap chorded vs native preview drivers. */
const PREVIEW_JOB_BASENAME = "preview-job";

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

async function setupPreviewLatexFiles(
  tempDir: string,
  latexStyle: SongLatexStyle,
): Promise<void> {
  const driverSrc =
    latexStyle === "songs_sty" ? "preview-song.tex" : "preview-song-songbook.tex";
  const driverRaw = await readFile(join(LATEX_DIR, driverSrc), "utf-8");
  const driverWritten = applyLayoutPlaceholders(driverRaw, PREVIEW_OUTPUT_SETTINGS);
  await writeFile(join(tempDir, `${PREVIEW_JOB_BASENAME}.tex`), driverWritten, "utf-8");

  await copyFile(join(LATEX_DIR, "font-body.tex"), join(tempDir, "font-body.tex"));

  if (latexStyle === "songs_sty") {
    await copyFile(join(LATEX_DIR, "preview-font.tex"), join(tempDir, "preview-font.tex"));
    await copyFile(join(LATEX_DIR, "songs.sty"), join(tempDir, "songs.sty"));
  } else {
    await copyFile(
      join(LATEX_DIR, "font-body-songbook.tex"),
      join(tempDir, "font-body-songbook.tex"),
    );
    await copyFile(
      join(LATEX_DIR, "preview-font-songbook.tex"),
      join(tempDir, "preview-font-songbook.tex"),
    );
    await copyFile(
      join(LATEX_DIR, "songbook-layout.sty"),
      join(tempDir, "songbook-layout.sty"),
    );
    await copyFile(
      join(LATEX_DIR, "songbook-style.tex"),
      join(tempDir, "songbook-style.tex"),
    );
  }
}

async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    await rm(tempDir, { recursive: true, force: true });
  } catch {}
}

export interface PreviewError {
  stage: "songmaker" | "pdflatex";
  message: string;
  logs?: string;
}

export function isPreviewError(result: unknown): result is PreviewError {
  return (
    typeof result === "object" &&
    result !== null &&
    "stage" in result &&
    "message" in result
  );
}

export async function convertToLatex(
  songContent: string,
  latexStyle: SongLatexStyle = DEFAULT_SONG_LATEX_STYLE,
): Promise<string | PreviewError> {
  const tempDir = await createTempDir();
  await setupPreviewLatexFiles(tempDir, latexStyle);

  const sngPath = join(tempDir, `${randomUUID()}.sng`);

  await writeFile(sngPath, songContent, "utf-8");

  try {
    const songmakerCmd = songmakerUsesSongsStyFlag(latexStyle)
      ? `${SONGMAKER_CLI} --songssty ${sngPath}`
      : `${SONGMAKER_CLI} ${sngPath}`;
    const { stderr } = await execAsync(songmakerCmd, {
      cwd: tempDir,
    });
    if (stderr?.trim()) {
      return {
        stage: "songmaker",
        message: stderr.trim(),
      };
    }
    const texPath = sngPath.replace(".sng", ".tex");
    const latex = await readFile(texPath, "utf-8");
    console.log("[songmaker-cli debug] generated tex for preview");
    console.log(latex);
    return latex;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      stage: "songmaker",
      message,
    };
  } finally {
    await cleanupTempDir(tempDir);
  }
}

export async function renderPdf(
  latexContent: string,
  latexStyle: SongLatexStyle = DEFAULT_SONG_LATEX_STYLE,
): Promise<string | PreviewError> {
  const tempDir = await createTempDir();
  await setupPreviewLatexFiles(tempDir, latexStyle);

  const generatedPath = join(tempDir, "generated-song.tex");
  const texPath = join(tempDir, `${PREVIEW_JOB_BASENAME}.tex`);

  await writeFile(generatedPath, latexContent, "utf-8");

  try {
    await execAsync(
      `pdflatex -interaction=batchmode -halt-on-error -file-line-error -output-directory=${tempDir} ${texPath}`,
      {
        cwd: tempDir,
      },
    );

    const logPath = join(tempDir, `${PREVIEW_JOB_BASENAME}.log`);
    let logs: string | undefined;
    if (existsSync(logPath)) {
      logs = await readFile(logPath, "utf-8");
    }

    const builtPdf = join(tempDir, `${PREVIEW_JOB_BASENAME}.pdf`);
    if (!existsSync(builtPdf)) {
      return {
        stage: "pdflatex",
        message:
          logs && logs.trim().length > 0
            ? extractPdflatexUserMessage(logs)
            : `pdflatex finished without producing ${PREVIEW_JOB_BASENAME}.pdf`,
        logs,
      };
    }

    const outputDir = await ensureOutputDir();
    const outputPdfPath = join(outputDir, `${randomUUID()}.pdf`);
    await copyFile(builtPdf, outputPdfPath);
    return outputPdfPath;
  } catch (error) {
    const logPath = join(tempDir, `${PREVIEW_JOB_BASENAME}.log`);
    let logs: string | undefined;
    if (existsSync(logPath)) {
      logs = await readFile(logPath, "utf-8");
    }
    const execMsg = error instanceof Error ? error.message : String(error);
    const message =
      logs && logs.trim().length > 0
        ? extractPdflatexUserMessage(logs)
        : execMsg;
    return {
      stage: "pdflatex",
      message,
      logs,
    };
  } finally {
    await cleanupTempDir(tempDir);
  }
}

export async function renderPng(pdfPath: string): Promise<string> {
  const pngPath = pdfPath.replace(".pdf", ".png");

  await execAsync(
    `pdftocairo -png -singlefile -f 1 -r 150 ${pdfPath} ${pngPath.replace(".png", "")}`,
  );

  try {
    const pngBuffer = await readFile(pngPath);
    return `data:image/png;base64,${pngBuffer.toString("base64")}`;
  } finally {
    try {
      await unlink(pdfPath);
    } catch {}
    try {
      await unlink(pngPath);
    } catch {}
  }
}

export interface PreviewResult {
  png?: string;
  error?: PreviewError;
}

export async function generatePreview(
  songContent: string,
  latexStyle: SongLatexStyle = DEFAULT_SONG_LATEX_STYLE,
): Promise<PreviewResult> {
  const latexResult = await convertToLatex(songContent, latexStyle);
  if (isPreviewError(latexResult)) {
    return { error: latexResult };
  }

  const pdfResult = await renderPdf(latexResult, latexStyle);
  if (isPreviewError(pdfResult)) {
    return { error: pdfResult };
  }

  const pngBase64 = await renderPng(pdfResult);
  return { png: pngBase64 };
}
