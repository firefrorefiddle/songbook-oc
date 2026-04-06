import type { Prisma } from "@prisma/client";

/**
 * Visibility scope for the songs list: owned, collaborated, or public.
 * Used for listing songs and for discovering which tags/categories appear in that scope.
 */
export function visibleSongScopeWhere(
  userId: string,
  includeArchived: boolean,
): Prisma.SongWhereInput {
  return {
    isArchived: includeArchived ? undefined : false,
    OR: [
      { ownerId: userId },
      { collaborations: { some: { userId } } },
      { isPublic: true },
    ],
  };
}

export function buildSongListWhere(args: {
  userId: string;
  includeArchived: boolean;
  search: string;
  tagId: string | null;
  categoryId: string | null;
}): Prisma.SongWhereInput {
  const { userId, includeArchived, search, tagId, categoryId } = args;
  const base = visibleSongScopeWhere(userId, includeArchived);
  return {
    ...base,
    ...(search ? { versions: { some: { title: { contains: search } } } } : {}),
    ...(tagId ? { tags: { some: { tagId } } } : {}),
    ...(categoryId ? { categories: { some: { categoryId } } } : {}),
  };
}

/** Tags that appear on at least one song in the visible scope (for filter dropdowns). */
export function songTagFilterOptionsWhere(
  userId: string,
  includeArchived: boolean,
): Prisma.SongTagWhereInput {
  return {
    songs: {
      some: {
        song: visibleSongScopeWhere(userId, includeArchived),
      },
    },
  };
}

export function songCategoryFilterOptionsWhere(
  userId: string,
  includeArchived: boolean,
): Prisma.SongCategoryWhereInput {
  return {
    songs: {
      some: {
        song: visibleSongScopeWhere(userId, includeArchived),
      },
    },
  };
}
