import { writeFile, unlink, mkdir, copyFile, readdir, rm } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { randomUUID } from "crypto";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const PROJECT_ROOT = process.cwd();
const SONGMAKER_CLI = join(PROJECT_ROOT, "bin", "songmaker-cli");
const LATEX_DIR = join(PROJECT_ROOT, "src/lib/server/latex");

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

async function setupLatexFiles(tempDir: string): Promise<void> {
  const files = ["layout.tex", "font.tex", "songs.sty", "single-song.tex"];
  for (const file of files) {
    await copyFile(join(LATEX_DIR, file), join(tempDir, file));
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
): Promise<string | PreviewError> {
  const tempDir = await createTempDir();
  await setupLatexFiles(tempDir);

  const sngPath = join(tempDir, `${randomUUID()}.sng`);

  await writeFile(sngPath, songContent, "utf-8");

  try {
    const { stdout, stderr } = await execAsync(`${SONGMAKER_CLI} ${sngPath}`, {
      cwd: tempDir,
    });
    if (stderr?.trim()) {
      return {
        stage: "songmaker",
        message: stderr.trim(),
      };
    }
    const texPath = sngPath.replace(".sng", ".tex");
    const { readFile } = await import("fs/promises");
    return await readFile(texPath, "utf-8");
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
): Promise<string | PreviewError> {
  const tempDir = await createTempDir();
  await setupLatexFiles(tempDir);

  const generatedPath = join(tempDir, "generated-song.tex");
  const texPath = join(tempDir, "single-song.tex");

  await writeFile(generatedPath, latexContent, "utf-8");

  try {
    const { stdout, stderr: pdflatexStderr } = await execAsync(
      `pdflatex -interaction=batchmode -output-directory=${tempDir} ${texPath}`,
      {
        cwd: tempDir,
      },
    );

    const logPath = join(tempDir, "single-song.log");
    let logs: string | undefined;
    if (existsSync(logPath)) {
      const { readFile } = await import("fs/promises");
      logs = await readFile(logPath, "utf-8");
    }

    if (pdflatexStderr?.trim()) {
      return {
        stage: "pdflatex",
        message: pdflatexStderr.trim(),
        logs,
      };
    }

    const outputDir = await ensureOutputDir();
    const outputPdfPath = join(outputDir, `${randomUUID()}.pdf`);
    await copyFile(join(tempDir, "single-song.pdf"), outputPdfPath);
    return outputPdfPath;
  } catch (error) {
    const logPath = join(tempDir, "single-song.log");
    let logs: string | undefined;
    if (existsSync(logPath)) {
      const { readFile } = await import("fs/promises");
      logs = await readFile(logPath, "utf-8");
    }
    const message = error instanceof Error ? error.message : String(error);
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
    `pdftocairo -png -singlefile -f 0 -r 150 ${pdfPath} ${pngPath.replace(".png", "")}`,
  );

  try {
    const { readFile } = await import("fs/promises");
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
): Promise<PreviewResult> {
  const latexResult = await convertToLatex(songContent);
  if (isPreviewError(latexResult)) {
    return { error: latexResult };
  }

  const pdfResult = await renderPdf(latexResult);
  if (isPreviewError(pdfResult)) {
    return { error: pdfResult };
  }

  const pngBase64 = await renderPng(pdfResult);
  return { png: pngBase64 };
}
