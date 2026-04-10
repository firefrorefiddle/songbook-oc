import { describe, it } from "vitest";
import { prisma } from "./prisma";
import { generateSongbookPdf } from "./songbookPdf";

/**
 * Emits LaTeX/toolchain NDJSON (see songbookPdf `agentDebugLog`).
 * Run locally: `pnpm test run src/lib/server/songbookPdf.buildFirst.test.ts`
 * Run on server after deploy: same command from ~/songbook-oc (full pnpm install).
 */
describe("songbookPdf.buildFirst", () => {
  it(
    "generates PDF for earliest songbook that has songs",
    async () => {
      const row = await prisma.songbook.findFirst({
        where: { versions: { some: { songs: { some: {} } } } },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (!row) {
        console.warn("[songbookPdf.buildFirst] no songbook with songs — skip");
        return;
      }
      await generateSongbookPdf(row.id);
    },
    180_000,
  );
});
