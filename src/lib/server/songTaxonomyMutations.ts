import type { PrismaClient } from "@prisma/client";

const MAX_LABEL_LENGTH = 120;

/** Trim, collapse whitespace, enforce max length. Returns null if empty or invalid. */
export function normalizeTaxonomyLabel(raw: string): string | null {
  const collapsed = raw.trim().replace(/\s+/g, " ");
  if (!collapsed) {
    return null;
  }
  if (collapsed.length > MAX_LABEL_LENGTH) {
    return null;
  }
  return collapsed;
}

type PrismaTx = Pick<
  PrismaClient,
  "songTag" | "songCategory" | "songTagOnSong" | "songCategoryOnSong"
>;

export async function addTagToSong(
  prisma: PrismaTx,
  songId: string,
  label: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = normalizeTaxonomyLabel(label);
  if (!name) {
    return { ok: false, error: "Tag name is required (max 120 characters)." };
  }

  const tag = await prisma.songTag.upsert({
    where: { name },
    create: { name },
    update: {},
  });

  const existing = await prisma.songTagOnSong.findUnique({
    where: { songId_tagId: { songId, tagId: tag.id } },
  });
  if (existing) {
    return { ok: false, error: "This song already has that tag." };
  }

  await prisma.songTagOnSong.create({
    data: { songId, tagId: tag.id },
  });
  return { ok: true };
}

export async function removeTagFromSong(
  prisma: PrismaTx,
  songId: string,
  tagId: string,
): Promise<void> {
  await prisma.songTagOnSong.deleteMany({
    where: { songId, tagId },
  });
}

export async function addCategoryToSong(
  prisma: PrismaTx,
  songId: string,
  label: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = normalizeTaxonomyLabel(label);
  if (!name) {
    return {
      ok: false,
      error: "Category name is required (max 120 characters).",
    };
  }

  const category = await prisma.songCategory.upsert({
    where: { name },
    create: { name },
    update: {},
  });

  const existing = await prisma.songCategoryOnSong.findUnique({
    where: {
      songId_categoryId: { songId, categoryId: category.id },
    },
  });
  if (existing) {
    return { ok: false, error: "This song already has that category." };
  }

  await prisma.songCategoryOnSong.create({
    data: { songId, categoryId: category.id },
  });
  return { ok: true };
}

export async function removeCategoryFromSong(
  prisma: PrismaTx,
  songId: string,
  categoryId: string,
): Promise<void> {
  await prisma.songCategoryOnSong.deleteMany({
    where: { songId, categoryId },
  });
}

export async function deleteSongTagGlobally(
  prisma: Pick<PrismaClient, "songTag">,
  tagId: string,
): Promise<void> {
  await prisma.songTag.delete({ where: { id: tagId } });
}

export async function deleteSongCategoryGlobally(
  prisma: Pick<PrismaClient, "songCategory">,
  categoryId: string,
): Promise<void> {
  await prisma.songCategory.delete({ where: { id: categoryId } });
}
