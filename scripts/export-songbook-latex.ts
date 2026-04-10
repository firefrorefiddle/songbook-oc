/**
 * Export the full LaTeX workspace for a songbook (same files as PDF generation, no pdflatex).
 *
 * Usage:
 *   pnpm exec tsx scripts/export-songbook-latex.ts [songbookId]
 *
 * If songbookId is omitted, uses the earliest songbook (by createdAt) that has at least one song.
 */
import { join } from "path";
import { prisma } from "../src/lib/server/prisma";
import { exportSongbookLatexWorkspace } from "../src/lib/server/songbookPdf";

const DEFAULT_OUT = join(process.cwd(), "tmp", "songbook-latex-export");

async function main() {
  let songbookId = process.argv[2]?.trim();
  if (!songbookId) {
    const row = await prisma.songbook.findFirst({
      where: { versions: { some: { songs: { some: {} } } } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!row) {
      console.error("No songbook with songs found.");
      process.exitCode = 1;
      return;
    }
    songbookId = row.id;
    console.log(`Using earliest songbook with songs: ${songbookId}`);
  }

  const outDir = process.env.SONGBOOK_LATEX_EXPORT_DIR?.trim() || DEFAULT_OUT;
  const meta = await exportSongbookLatexWorkspace(songbookId, outDir);
  console.log(JSON.stringify({ ...meta, outDir }, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
