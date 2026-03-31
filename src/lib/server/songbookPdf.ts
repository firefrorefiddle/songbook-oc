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
const PDF_STORAGE_DIR = join(PROJECT_ROOT, "storage", "pdfs");

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

interface SongMetadata {
  copyright?: string;
  reference?: string;
  extraIndex?: string;
  translationBy?: string;
  musicBy?: string;
  lyricsBy?: string;
}

function buildSongContent(
  title: string,
  content: string,
  author?: string | null,
  metadata?: SongMetadata,
): string {
  if (content.trim().startsWith("title:")) {
    return content;
  }
  let sngContent = `title: ${title}\n`;
  if (author?.trim()) {
    sngContent += `author: ${author}\n`;
  }
  if (metadata?.lyricsBy?.trim()) {
    sngContent += `lyricsBy: ${metadata.lyricsBy}\n`;
  }
  if (metadata?.musicBy?.trim()) {
    sngContent += `musicBy: ${metadata.musicBy}\n`;
  }
  if (metadata?.translationBy?.trim()) {
    sngContent += `translationBy: ${metadata.translationBy}\n`;
  }
  if (metadata?.copyright?.trim()) {
    sngContent += `copyright: ${metadata.copyright}\n`;
  }
  if (metadata?.reference?.trim()) {
    sngContent += `reference: ${metadata.reference}\n`;
  } else {
    sngContent += "reference:\n";
  }
  if (metadata?.extraIndex?.trim()) {
    sngContent += `extra-index: ${metadata.extraIndex}\n`;
  }
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
  const parsed = JSON.parse(metadata || "{}") as SongMetadata;
  const sngContent = buildSongContent(title, content, author, parsed);

  const sngPath = join(tempDir, `${randomUUID()}.sng`);
  await writeFile(sngPath, sngContent, "utf-8");

  await execAsync(`${SONGMAKER_CLI} ${sngPath}`, {
    cwd: tempDir,
  });

  const texPath = sngPath.replace(".sng", ".tex");
  const latex = await readFile(texPath, "utf-8");
  return latex;
}

interface TocSongEntry {
  order: number;
  songVersion: {
    title: string;
  };
}

function generateTableOfContents(songs: TocSongEntry[]): string {
  const tocLines = [
    "\\clearpage",
    "\\begin{center}",
    "\\Large\\textbf{Inhaltsverzeichnis}",
    "\\end{center}",
    "\\begin{songtoc}",
  ];

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    const songNumber = i + 1;
    tocLines.push(`\\item[${songNumber}] \\textbf{${song.songVersion.title}}`);
  }

  tocLines.push("\\end{songtoc}");

  return tocLines.join("\n");
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

    const tocContent = generateTableOfContents(version.songs);
    await writeFile(
      join(tempDir, "table-of-contents.tex"),
      tocContent,
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

    const pdfPath = join(storageDir, `${version.id}.pdf`);
    const logPath = join(storageDir, `${version.id}.log`);

    await copyFile(join(tempDir, "chorded.pdf"), pdfPath);
    await copyFile(join(tempDir, "chorded.log"), logPath);

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
    const tempLogPath = join(tempDir, "chorded.log");
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
