/**
 * Replaces syllable-style `word^rest` fragments that break the LaTeX songs package
 * (ChordPro `^` = replay chord) with full words. Run after fixing seed .sng files:
 *   pnpm exec tsx scripts/patch-song-syllable-carets.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const dbUrl = process.env.DATABASE_URL ?? "(default from .env)";
console.log("DATABASE_URL:", dbUrl);

const REPLACEMENTS: [string, string][] = [
  ["be^halt", "behalten"],
  ["zu^rück", "zurück"],
  ["ver^gisst", "vergisst"],
  ["umge^stalten", "umgestalten"],
  ["wieder^geben", "wiedergeben"],
  ["ver^treiben", "vertreiben"],
  ["be^ginnen", "beginnen"],
  ["nie^mals", "niemals"],
];

async function main() {
  const versions = await prisma.songVersion.findMany({
    select: { id: true, title: true, content: true },
  });

  let updated = 0;
  for (const v of versions) {
    let { content } = v;
    for (const [from, to] of REPLACEMENTS) {
      if (content.includes(from)) {
        content = content.split(from).join(to);
      }
    }
    if (content !== v.content) {
      await prisma.songVersion.update({
        where: { id: v.id },
        data: { content },
      });
      console.log(`Updated: ${v.title} (${v.id})`);
      updated++;
    }
  }

  console.log(`Done. ${updated} song version(s) patched.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
