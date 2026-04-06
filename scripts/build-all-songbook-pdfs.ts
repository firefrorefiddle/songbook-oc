/**
 * One-off: build PDF for every songbook that has a version with at least one song.
 * Run: pnpm exec tsx scripts/build-all-songbook-pdfs.ts
 */
import { prisma } from "../src/lib/server/prisma";
import { generateSongbookPdf } from "../src/lib/server/songbookPdf";

async function main() {
  const songbooks = await prisma.songbook.findMany({
    select: {
      id: true,
      versions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          title: true,
          _count: { select: { songs: true } },
        },
      },
    },
  });

  const toBuild = songbooks.filter(
    (b) => b.versions[0] && b.versions[0]._count.songs > 0,
  );

  console.log(
    `Found ${songbooks.length} songbooks; ${toBuild.length} have songs in latest version.\n`,
  );

  const failures: { id: string; title: string; error: string }[] = [];

  for (const sb of toBuild) {
    const v = sb.versions[0];
    const label = `${v.title} (${sb.id})`;
    process.stdout.write(`Building: ${label} ... `);
    try {
      await generateSongbookPdf(sb.id);
      console.log("OK");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`FAIL\n  ${msg}`);
      failures.push({ id: sb.id, title: v.title, error: msg });
    }
  }

  if (failures.length > 0) {
    console.log(`\n--- ${failures.length} failure(s) ---`);
    for (const f of failures) {
      console.log(`- ${f.title} [${f.id}]: ${f.error}`);
    }
    process.exitCode = 1;
  } else {
    console.log("\nAll songbook PDF builds succeeded.");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
