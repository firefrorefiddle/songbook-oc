import { writeFile, copyFile, rm, mkdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { exec } from "child_process";
import { promisify } from "util";
import { prisma } from "$lib/server/prisma";

const execAsync = promisify(exec);

const PROJECT_ROOT = process.cwd();
const SONGMAKER_CLI = "/home/mike/.cabal/bin/songmaker-cli";
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
  const files = ["layout.tex", "font.tex", "songs.sty", "chorded.tex"];
  for (const file of files) {
    await copyFile(join(LATEX_DIR, file), join(tempDir, file));
  }
}

async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    await rm(tempDir, { recursive: true, force: true });
  } catch {}
}

function buildSongContent(
  title: string,
  content: string,
  author?: string | null,
  copyright?: string,
): string {
  if (content.trim().startsWith("title:")) {
    return content;
  }
  let sngContent = `title: ${title}\n`;
  if (author?.trim()) {
    sngContent += `author: ${author}\n`;
  }
  if (copyright?.trim()) {
    sngContent += `copyright: ${copyright}\n`;
  }
  sngContent += "reference:\n";
  sngContent += "***\n";
  sngContent += content;
  return sngContent;
}

async function convertSongToLatex(
  title: string,
  content: string,
  author: string | null,
  metadata: string,
  tempDir: string,
): Promise<string> {
  const parsed = JSON.parse(metadata || "{}");
  const sngContent = buildSongContent(title, content, author, parsed.copyright);

  const sngPath = join(tempDir, `${randomUUID()}.sng`);
  await writeFile(sngPath, sngContent, "utf-8");

  await execAsync(`${SONGMAKER_CLI} ${sngPath}`, {
    cwd: tempDir,
  });

  const texPath = sngPath.replace(".sng", ".tex");
  const latex = await readFile(texPath, "utf-8");
  return latex;
}

export async function generateSongbookPdf(
  songbookId: string,
  versionId?: string,
): Promise<string> {
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

  const tempDir = await createTempDir();

  try {
    await setupLatexFiles(tempDir);

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

    const texPath = join(tempDir, "chorded.tex");

    await execAsync(
      `pdflatex -interaction=batchmode -output-directory=${tempDir} ${texPath}`,
      { cwd: tempDir },
    );

    await execAsync(
      `pdflatex -interaction=batchmode -output-directory=${tempDir} ${texPath}`,
      { cwd: tempDir },
    );

    const outputDir = await ensureOutputDir();
    const outputPdfPath = join(outputDir, `${songbookId}-${version.id}.pdf`);
    await copyFile(join(tempDir, "chorded.pdf"), outputPdfPath);

    return outputPdfPath;
  } finally {
    await cleanupTempDir(tempDir);
  }
}
