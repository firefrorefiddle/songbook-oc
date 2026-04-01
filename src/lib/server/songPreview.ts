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

export async function convertToLatex(songContent: string): Promise<string> {
  const tempDir = await createTempDir();
  await setupLatexFiles(tempDir);

  const sngPath = join(tempDir, `${randomUUID()}.sng`);

  await writeFile(sngPath, songContent, "utf-8");

  try {
    await execAsync(`${SONGMAKER_CLI} ${sngPath}`, {
      cwd: tempDir,
    });
    const texPath = sngPath.replace(".sng", ".tex");
    const { readFile } = await import("fs/promises");
    return await readFile(texPath, "utf-8");
  } finally {
    await cleanupTempDir(tempDir);
  }
}

export async function renderPdf(latexContent: string): Promise<string> {
  const tempDir = await createTempDir();
  await setupLatexFiles(tempDir);

  const generatedPath = join(tempDir, "generated-song.tex");
  const texPath = join(tempDir, "single-song.tex");

  await writeFile(generatedPath, latexContent, "utf-8");

  try {
    await execAsync(
      `pdflatex -interaction=batchmode -output-directory=${tempDir} ${texPath}`,
      {
        cwd: tempDir,
      },
    );
    const outputDir = await ensureOutputDir();
    const outputPdfPath = join(outputDir, `${randomUUID()}.pdf`);
    await copyFile(join(tempDir, "single-song.pdf"), outputPdfPath);
    return outputPdfPath;
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

export async function generatePreview(songContent: string): Promise<string> {
  const latex = await convertToLatex(songContent);
  const pdfPath = await renderPdf(latex);
  const pngBase64 = await renderPng(pdfPath);
  return pngBase64;
}
