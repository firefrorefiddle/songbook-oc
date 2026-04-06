import type { Prisma } from "@prisma/client";

/** Trims search input; empty after trim means no search filter (consistent for API and pages). */
export function normalizeSongListSearch(search: string): string {
  return search.trim();
}

/** Match when any version field relevant to discovery contains the term (substring, case-sensitive per SQLite). */
export function songVersionTextSearchWhere(
  term: string,
): Prisma.SongVersionWhereInput {
  return {
    OR: [
      { title: { contains: term } },
      { author: { contains: term } },
      { content: { contains: term } },
      { metadata: { contains: term } },
    ],
  };
}

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
  const trimmedSearch = normalizeSongListSearch(search);
  return {
    ...base,
    ...(trimmedSearch
      ? { versions: { some: songVersionTextSearchWhere(trimmedSearch) } }
      : {}),
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
