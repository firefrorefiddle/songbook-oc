import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync, existsSync } from "fs";
import { basename } from "path";

const prisma = new PrismaClient();

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

function getSngFiles(dirPath: string): string[] {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sng"))
    .map((entry) => join(dirPath, entry.name));
}

async function importSongs(sngDir: string, ownerId: string): Promise<void> {
  const files = getSngFiles(sngDir);

  console.log(`Found ${files.length} .sng files`);

  let imported = 0;
  let skipped = 0;

  for (const filePath of files) {
    try {
      const content = readFileSync(filePath, "utf-8");
      const parsed = parseSngFile(content, filePath);

      if (!parsed.content.trim()) {
        console.warn(`Skipping empty song: ${parsed.metadata.title}`);
        skipped++;
        continue;
      }

      const author = parsed.metadata.author || parsed.metadata.lyricsBy;
      const metadata = buildMetadataJson(parsed.metadata);

      await prisma.song.create({
        data: {
          ownerId,
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
}

import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

const liedermappeDir = process.argv[2] || join(projectRoot, "seed_data");
const clearExisting = process.argv.includes("--clear");

const SONGBOOKS = [
  { name: "Gemeinde", title: "Gemeinde" },
  { name: "Gemeinde_OH", title: "Gemeinde (Overhead)" },
  { name: "Gemeinde_TO", title: "Gemeinde (Text Only)" },
  { name: "Jugend", title: "Jugend" },
  { name: "Jugend_OH", title: "Jugend (Overhead)" },
  { name: "Jugend_TO", title: "Jugend (Text Only)" },
  { name: "Eigene_Mappe", title: "Eigene Mappe" },
  { name: "Eigene_Mappe_2", title: "Eigene Mappe 2" },
  { name: "Eigene_Mappe_3", title: "Eigene Mappe 3" },
];

interface SongRef {
  filename: string;
  order: number;
}

function parseSongsTexFile(content: string, liederDir: string): SongRef[] {
  const refs: SongRef[] = [];
  const lines = content.split("\n");

  let order = 1;
  for (const line of lines) {
    const match = line.match(/\\input\{lieder\/(.+?)\}/);
    if (match) {
      const filename = match[1];
      refs.push({ filename, order });
      order++;
    }
  }

  return refs;
}

function getSongbookSongs(
  texDir: string,
  mainTexFile: string,
  liederDir: string,
): SongRef[] {
  const mainPath = join(texDir, mainTexFile);
  if (!existsSync(mainPath)) {
    console.warn(`Songbook file not found: ${mainPath}`);
    return [];
  }

  const content = readFileSync(mainPath, "utf-8");
  const allRefs: SongRef[] = [];

  const includedFiles = content.match(/\\input\{tex\/(.+?)\}/g) || [];

  let order = 1;
  for (const include of includedFiles) {
    const match = include.match(/\\input\{tex\/(.+?)\}/);
    if (match) {
      const includedFile = match[1];
      const includedPath = join(texDir, `${includedFile}.tex`);

      if (existsSync(includedPath)) {
        const includedContent = readFileSync(includedPath, "utf-8");
        const refs = parseSongsTexFile(includedContent, liederDir);
        for (const ref of refs) {
          allRefs.push({ ...ref, order });
          order++;
        }
      }
    }
  }

  return allRefs;
}

function filenameToSongKey(filename: string): string {
  return filename.replace(/_/g, " ").replace(/,/g, "");
}

async function createSongbooks(
  liedermappeDir: string,
  ownerId: string,
): Promise<void> {
  const texDir = join(liedermappeDir, "tex");
  const liederDir = join(liedermappeDir, "lieder");

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    console.error("No admin user found.");
    return;
  }

  const existingSongbooks = await prisma.songbook.findMany({
    where: { ownerId },
    include: { versions: { include: { songs: true } } },
  });

  const existingSongbookNames = new Set(
    existingSongbooks.map((sb) => sb.versions[0]?.title),
  );

  const songs = await prisma.song.findMany({
    include: { versions: { orderBy: { createdAt: "asc" }, take: 1 } },
  });

  const songMap = new Map<string, string>();
  for (const song of songs) {
    const version = song.versions[0];
    if (version) {
      const titleKey = filenameToSongKey(
        version.title.toLowerCase().replace(/ /g, "_").replace(/,/g, ","),
      );
      songMap.set(titleKey, version.id);
      songMap.set(version.title.toLowerCase(), version.id);
    }
  }

  const liederFiles = readdirSync(liederDir).filter((f) => f.endsWith(".sng"));
  for (const file of liederFiles) {
    const filename = file.replace(".sng", "");
    const key = filenameToSongKey(filename);
    if (!songMap.has(key)) {
      songMap.set(key, "");
    }
  }

  let created = 0;

  for (const sb of SONGBOOKS) {
    if (existingSongbookNames.has(sb.title)) {
      console.log(`Songbook "${sb.title}" already exists, skipping.`);
      continue;
    }

    const texFile = `${sb.name}.tex`;
    const songRefs = getSongbookSongs(texDir, texFile, liederDir);

    if (songRefs.length === 0) {
      console.warn(`No songs found for songbook: ${sb.title}`);
      continue;
    }

    const songVersionIds: { songVersionId: string; order: number }[] = [];
    for (const ref of songRefs) {
      const key = filenameToSongKey(ref.filename);
      let songVersionId = songMap.get(key);

      if (!songVersionId) {
        const altKey = ref.filename.replace(/_/g, " ").replace(/,/g, "");
        songVersionId = songMap.get(altKey);
      }

      if (!songVersionId) {
        const titleFromFile = ref.filename.replace(/_/g, " ").replace(/,/g, "");
        const matched = Array.from(songMap.entries()).find(([k]) =>
          k.includes(titleFromFile.toLowerCase()),
        );
        if (matched) {
          songVersionId = matched[1];
        }
      }

      if (songVersionId) {
        songVersionIds.push({ songVersionId, order: ref.order });
      } else {
        console.warn(`Song not found for ref: ${ref.filename}`);
      }
    }

    if (songVersionIds.length === 0) {
      console.warn(`No valid songs found for songbook: ${sb.title}`);
      continue;
    }

    const songbook = await prisma.songbook.create({
      data: {
        ownerId,
        isPublic: true,
        versions: {
          create: {
            title: sb.title,
            songs: {
              create: songVersionIds,
            },
          },
        },
      },
    });

    console.log(
      `Created songbook: ${sb.title} with ${songVersionIds.length} songs`,
    );
    created++;
  }

  console.log(`\nSongbook creation complete: ${created} songbooks created`);
}

async function main() {
  const sngDir = join(liedermappeDir, "lieder");

  if (clearExisting) {
    console.log("Clearing existing data...");
    await prisma.songbookSong.deleteMany({});
    await prisma.songbookVersion.deleteMany({});
    await prisma.songbook.deleteMany({});
    await prisma.songVersion.deleteMany({});
    await prisma.song.deleteMany({});
  }

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    console.error("No admin user found. Run /setup first to create an admin.");
    process.exit(1);
  }
  const ownerId = admin.id;
  console.log("Using admin user: " + admin.email);

  console.log("\n=== Importing Songs ===");
  await importSongs(sngDir, ownerId);

  console.log("\n=== Creating Songbooks ===");
  await createSongbooks(liedermappeDir, ownerId);

  await prisma.$disconnect();
  console.log("\n=== Seed Complete ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
