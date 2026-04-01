import { PrismaClient } from "@prisma/client";
import { existsSync } from "fs";
import { readdir, readFile } from "fs/promises";
import { basename } from "path";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import {
  buildCollectionCategoryIndex,
  inferSongTaxonomy,
  normaliseSongFilename,
} from "../src/lib/server/songTaxonomy";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

interface SngMetadata {
  title: string;
  author?: string;
  lyricsBy?: string;
  musicBy?: string;
  copyright?: string;
  reference?: string;
  extraIndex?: string;
  translationBy?: string;
  numbering?: string;
}

interface ParsedSng {
  metadata: SngMetadata;
  content: string;
  filename: string;
}

function parseSngFile(content: string, filename: string): ParsedSng {
  const lines = content.split("\n");
  const metadata: Partial<SngMetadata> = {};
  let contentStartIndex = lines.findIndex((line) => line.trim() === "***");

  if (contentStartIndex === -1) {
    contentStartIndex = lines.length;
  }

  for (let i = 0; i < contentStartIndex; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();

    switch (key) {
      case "title":
        metadata.title = value;
        break;
      case "author":
        metadata.author = value;
        break;
      case "lyricsby":
        metadata.lyricsBy = value;
        break;
      case "musicby":
        metadata.musicBy = value;
        break;
      case "copyright":
        metadata.copyright = value;
        break;
      case "reference":
        metadata.reference = value;
        break;
      case "extra-index":
        metadata.extraIndex = value;
        break;
      case "translationby":
        metadata.translationBy = value;
        break;
      case "numbering":
        metadata.numbering = value;
        break;
    }
  }

  if (!metadata.title) {
    metadata.title = basename(filename, ".sng").replace(/_/g, " ");
  }

  const songContent = lines
    .slice(contentStartIndex + 1)
    .join("\n")
    .trim();

  return {
    metadata: metadata as SngMetadata,
    content: songContent,
    filename,
  };
}

function buildMetadataJson(metadata: SngMetadata): string {
  const metaObj: Record<string, string> = {};

  if (metadata.copyright) metaObj.copyright = metadata.copyright;
  if (metadata.reference) metaObj.reference = metadata.reference;
  if (metadata.extraIndex) metaObj.extraIndex = metadata.extraIndex;
  if (metadata.translationBy) metaObj.translationBy = metadata.translationBy;
  if (metadata.numbering) metaObj.numbering = metadata.numbering;
  if (metadata.musicBy) metaObj.musicBy = metadata.musicBy;
  if (metadata.lyricsBy) metaObj.lyricsBy = metadata.lyricsBy;

  return JSON.stringify(metaObj);
}

async function getSngFiles(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sng"))
    .map((entry) => join(dirPath, entry.name));
}

async function getCollectionCategoryIndex(
  sngDir: string,
): Promise<Map<string, string[]>> {
  const texDir = join(dirname(sngDir), "tex");
  if (!existsSync(texDir)) {
    return new Map();
  }

  const entries = await readdir(texDir, { withFileTypes: true });
  const texFiles = entries.filter(
    (entry) => entry.isFile() && entry.name.endsWith(".tex"),
  );
  const texContents = await Promise.all(
    texFiles.map(
      async (entry) =>
        [
          entry.name,
          await readFile(join(texDir, entry.name), "utf-8"),
        ] as const,
    ),
  );

  return buildCollectionCategoryIndex(Object.fromEntries(texContents));
}

async function importSongs(
  sngDir: string,
  clearExisting: boolean = false,
): Promise<void> {
  const prisma = new PrismaClient();

  if (clearExisting) {
    console.log("Clearing existing songs...");
    await prisma.songbookSong.deleteMany({});
    await prisma.songbookVersion.deleteMany({});
    await prisma.songbook.deleteMany({});
    await prisma.songVersion.deleteMany({});
    await prisma.song.deleteMany({});
    console.log("Existing data cleared.");
  }

  const files = await getSngFiles(sngDir);
  const collectionCategoryIndex = await getCollectionCategoryIndex(sngDir);
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    throw new Error(
      "No admin user found. Run /setup first to create an admin.",
    );
  }

  console.log(`Found ${files.length} .sng files`);

  let imported = 0;
  let skipped = 0;

  for (const filePath of files) {
    try {
      const content = await readFile(filePath, "utf-8");
      const parsed = parseSngFile(content, filePath);

      if (!parsed.content.trim()) {
        console.warn(`Skipping empty song: ${parsed.metadata.title}`);
        skipped++;
        continue;
      }

      const author = parsed.metadata.author || parsed.metadata.lyricsBy;
      const metadata = buildMetadataJson(parsed.metadata);
      const taxonomy = inferSongTaxonomy({
        filename: basename(filePath),
        title: parsed.metadata.title,
        content: parsed.content,
        metadata: parsed.metadata,
        collectionCategories:
          collectionCategoryIndex.get(
            normaliseSongFilename(basename(filePath)),
          ) ?? [],
      });

      await prisma.song.create({
        data: {
          ownerId: admin.id,
          categories: {
            create: taxonomy.categories.map((category) => ({
              category: {
                connectOrCreate: {
                  where: { name: category },
                  create: { name: category },
                },
              },
            })),
          },
          tags: {
            create: taxonomy.tags.map((tag) => ({
              tag: {
                connectOrCreate: {
                  where: { name: tag },
                  create: { name: tag },
                },
              },
            })),
          },
          versions: {
            create: {
              title: parsed.metadata.title,
              author: author || null,
              content: parsed.content,
              metadata,
            },
          },
        },
      });

      imported++;
      console.log(`Imported: ${parsed.metadata.title}`);
    } catch (error) {
      console.error(`Error importing ${filePath}:`, error);
      skipped++;
    }
  }

  console.log(
    `\nImport complete: ${imported} songs imported, ${skipped} skipped`,
  );
  await prisma.$disconnect();
}

const sngDir = process.argv[2] || join(projectRoot, "seed_data", "lieder");
const clearExisting = process.argv.includes("--clear");

importSongs(sngDir, clearExisting).catch((e) => {
  console.error(e);
  process.exit(1);
});
