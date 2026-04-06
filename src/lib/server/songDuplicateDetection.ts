import type { PrismaClient } from "@prisma/client";

import {
  getPreferredSongVersion,
  parseSongMetadata,
  type SongVersionLike,
} from "$lib/songVersions";
import type {
  DuplicateTitleMatch,
  SongCreationWarning,
} from "$lib/songCreationWarnings";
import { visibleSongScopeWhere } from "$lib/server/songListQuery";

/** Collapse case, punctuation, and diacritics so "Über" and "Uber" align for matching. */
export function normalizeSongTitleForMatch(raw: string): string {
  const s = raw
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
  return s
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n]!;
}

/** Similarity in [0,1]; longer strings use a slightly looser threshold in callers. */
export function normalizedTitleSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length, 1);
  return 1 - levenshtein(a, b) / maxLen;
}

const FUZZY_MIN_LEN = 4;
const FUZZY_THRESHOLD_SHORT = 0.9;
const FUZZY_THRESHOLD_LONG = 0.88;
const FUZZY_LONG_LEN = 12;

function titlesAreFuzzyDuplicate(normalizedNew: string, normalizedExisting: string): boolean {
  const minLen = Math.min(normalizedNew.length, normalizedExisting.length);
  if (minLen < FUZZY_MIN_LEN) return false;
  const sim = normalizedTitleSimilarity(normalizedNew, normalizedExisting);
  const threshold =
    Math.max(normalizedNew.length, normalizedExisting.length) >= FUZZY_LONG_LEN
      ? FUZZY_THRESHOLD_LONG
      : FUZZY_THRESHOLD_SHORT;
  return sim >= threshold;
}

function dedupeMatchesBySong(matches: DuplicateTitleMatch[]): DuplicateTitleMatch[] {
  const byId = new Map<string, DuplicateTitleMatch>();
  for (const m of matches) {
    const prev = byId.get(m.songId);
    if (!prev || (m.matchKind === "normalized" && prev.matchKind === "fuzzy")) {
      byId.set(m.songId, m);
    }
  }
  return [...byId.values()];
}

export async function findPossibleDuplicateTitleWarnings(
  prisma: PrismaClient,
  userId: string,
  title: string,
  options?: { excludeSongId?: string },
): Promise<SongCreationWarning[]> {
  const normalizedNew = normalizeSongTitleForMatch(title);
  if (!normalizedNew) return [];

  const rows = await prisma.song.findMany({
    where: visibleSongScopeWhere(userId, false),
    select: {
      id: true,
      recommendedVersionId: true,
      recommendedVersion: {
        select: {
          id: true,
          title: true,
          author: true,
          content: true,
          metadata: true,
          createdAt: true,
        },
      },
      versions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          title: true,
          author: true,
          content: true,
          metadata: true,
          createdAt: true,
        },
      },
    },
  });

  const rawMatches: DuplicateTitleMatch[] = [];

  for (const row of rows) {
    if (options?.excludeSongId && row.id === options.excludeSongId) continue;

    const preferred = getPreferredSongVersion(
      row as {
        recommendedVersionId: string | null;
        recommendedVersion: SongVersionLike | null;
        versions: SongVersionLike[];
      },
    );
    const displayTitle = preferred?.title ?? "";
    const normalizedExisting = normalizeSongTitleForMatch(displayTitle);
    if (!normalizedExisting) continue;

    if (normalizedNew === normalizedExisting) {
      rawMatches.push({
        songId: row.id,
        versionTitle: displayTitle,
        matchKind: "normalized",
      });
    } else if (titlesAreFuzzyDuplicate(normalizedNew, normalizedExisting)) {
      rawMatches.push({
        songId: row.id,
        versionTitle: displayTitle,
        matchKind: "fuzzy",
      });
    }
  }

  const matches = dedupeMatchesBySong(rawMatches);
  if (matches.length === 0) return [];

  return [
    {
      code: "possible_duplicate_titles",
      severity: "warning",
      message:
        "This title is very similar to existing songs you can see. Confirm you are not creating a duplicate.",
      matches,
    },
  ];
}

export function metadataQualityWarnings(input: {
  author: string | null | undefined;
  metadata: Record<string, unknown> | string | null | undefined;
}): SongCreationWarning[] {
  const out: SongCreationWarning[] = [];
  if (!input.author?.trim()) {
    out.push({
      code: "metadata_missing_author",
      severity: "warning",
      message:
        "No author is set. Adding one makes the library easier to browse and credits sources correctly.",
    });
  }
  const meta =
    typeof input.metadata === "string"
      ? parseSongMetadata(input.metadata)
      : input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
        ? (Object.fromEntries(
            Object.entries(input.metadata).filter(([, v]) => typeof v === "string"),
          ) as Record<string, string>)
        : {};
  if (!meta.copyright?.trim()) {
    out.push({
      code: "metadata_missing_copyright",
      severity: "warning",
      message:
        "No copyright line in metadata. You will need it for many printed songbooks and projections.",
    });
  }
  return out;
}

export async function buildSongCreationWarnings(
  prisma: PrismaClient,
  userId: string,
  input: {
    title: string;
    author: string | null | undefined;
    metadata: Record<string, unknown> | string | null | undefined;
  },
  options?: { excludeSongId?: string },
): Promise<SongCreationWarning[]> {
  const duplicate = await findPossibleDuplicateTitleWarnings(
    prisma,
    userId,
    input.title,
    options,
  );
  const meta = metadataQualityWarnings({
    author: input.author,
    metadata: input.metadata,
  });
  return [...duplicate, ...meta];
}
