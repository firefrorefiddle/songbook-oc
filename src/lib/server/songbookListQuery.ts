import { Prisma, type PrismaClient } from "@prisma/client";

/**
 * Visibility for songbook lists: owned, collaborated on, or public.
 * Mirrors song list access so index filters stay consistent with the rest of the app.
 */
export function visibleSongbookScopeWhere(
  userId: string,
  includeArchived: boolean,
): Prisma.SongbookWhereInput {
  return {
    isArchived: includeArchived ? undefined : false,
    OR: [
      { ownerId: userId },
      { collaborations: { some: { userId } } },
      { isPublic: true },
    ],
  };
}

export function buildSongbookListWhere(args: {
  userId: string;
  includeArchived: boolean;
  search: string;
  /** When non-null, restrict to these songbook ids (e.g. taxonomy on latest version). */
  taxonomySongbookIds: string[] | null;
}): Prisma.SongbookWhereInput {
  const { userId, includeArchived, search, taxonomySongbookIds } = args;
  const base: Prisma.SongbookWhereInput = {
    ...visibleSongbookScopeWhere(userId, includeArchived),
    ...(search ? { versions: { some: { title: { contains: search } } } } : {}),
  };
  if (taxonomySongbookIds !== null) {
    return { ...base, id: { in: taxonomySongbookIds } };
  }
  return base;
}

/**
 * Songbooks whose *latest* version contains at least one entry whose underlying Song
 * satisfies the given tag and/or category (AND when both are set — same as /songs).
 */
export async function findSongbookIdsMatchingLatestVersionTaxonomy(
  prisma: PrismaClient,
  filter: { tagId: string | null; categoryId: string | null },
): Promise<string[]> {
  const { tagId, categoryId } = filter;
  if (!tagId && !categoryId) {
    return [];
  }

  const tagClause = tagId
    ? Prisma.sql`AND EXISTS (
        SELECT 1 FROM "SongTagOnSong" st
        WHERE st."songId" = sv."songId" AND st."tagId" = ${tagId}
      )`
    : Prisma.empty;

  const categoryClause = categoryId
    ? Prisma.sql`AND EXISTS (
        SELECT 1 FROM "SongCategoryOnSong" sc
        WHERE sc."songId" = sv."songId" AND sc."categoryId" = ${categoryId}
      )`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT sb."id" AS id
    FROM "Songbook" sb
    WHERE EXISTS (
      SELECT 1
      FROM "SongbookVersion" lv
      WHERE lv."songbookId" = sb."id"
        AND lv."id" = (
          SELECT lv2."id"
          FROM "SongbookVersion" lv2
          WHERE lv2."songbookId" = sb."id"
          ORDER BY lv2."createdAt" DESC, lv2."id" DESC
          LIMIT 1
        )
        AND EXISTS (
          SELECT 1
          FROM "SongbookSong" ss
          INNER JOIN "SongVersion" sv ON sv."id" = ss."songVersionId"
          WHERE ss."songbookVersionId" = lv."id"
            ${tagClause}
            ${categoryClause}
        )
    )
  `;

  return rows.map((r) => r.id);
}
