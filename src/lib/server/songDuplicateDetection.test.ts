import { describe, expect, it, vi } from "vitest";

import type { SongCreationWarning } from "$lib/songCreationWarnings";

import {
  buildSongCreationWarnings,
  findPossibleDuplicateTitleWarnings,
  levenshtein,
  metadataQualityWarnings,
  normalizeSongTitleForMatch,
  normalizedTitleSimilarity,
} from "./songDuplicateDetection";

describe("normalizeSongTitleForMatch", () => {
  it("folds case, diacritics, and punctuation", () => {
    expect(normalizeSongTitleForMatch("  The  Über-Foo!  ")).toBe("the uber foo");
  });

  it("returns empty for whitespace-only titles", () => {
    expect(normalizeSongTitleForMatch("   \n\t  ")).toBe("");
  });
});

describe("levenshtein / normalizedTitleSimilarity", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshtein("abc", "abc")).toBe(0);
    expect(normalizedTitleSimilarity("abc", "abc")).toBe(1);
  });

  it("counts single-character edits", () => {
    expect(levenshtein("abc", "abx")).toBe(1);
  });
});

describe("metadataQualityWarnings", () => {
  it("warns when author and copyright are missing", () => {
    const w = metadataQualityWarnings({
      author: null,
      metadata: {},
    });
    expect(w.map((x) => x.code)).toEqual([
      "metadata_missing_author",
      "metadata_missing_copyright",
    ]);
  });

  it("does not warn when author and copyright are present", () => {
    expect(
      metadataQualityWarnings({
        author: "A",
        metadata: { copyright: "CCLI" },
      }),
    ).toEqual([]);
  });

  it("reads copyright from JSON metadata string", () => {
    const w = metadataQualityWarnings({
      author: "A",
      metadata: "{}",
    });
    expect(w.map((x) => x.code)).toEqual(["metadata_missing_copyright"]);
  });
});

describe("findPossibleDuplicateTitleWarnings", () => {
  it("returns normalized match against visible songs", async () => {
    const prisma = {
      song: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "s1",
            recommendedVersionId: null,
            recommendedVersion: null,
            versions: [
              {
                id: "v1",
                title: "Amazing Grace!",
                author: null,
                content: "",
                metadata: "{}",
                createdAt: new Date(),
              },
            ],
          },
        ]),
      },
    };

    const w = await findPossibleDuplicateTitleWarnings(
      prisma as never,
      "u1",
      "amazing   grace",
    );
    expect(w).toHaveLength(1);
    expect(w[0]?.code).toBe("possible_duplicate_titles");
    const dup = w[0] as Extract<
      SongCreationWarning,
      { code: "possible_duplicate_titles" }
    >;
    expect(dup.matches[0]?.matchKind).toBe("normalized");
    expect(dup.matches[0]?.songId).toBe("s1");
  });

  it("excludes a song id when creating a new version", async () => {
    const prisma = {
      song: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "same",
            recommendedVersionId: null,
            recommendedVersion: null,
            versions: [
              {
                id: "v1",
                title: "Hello World",
                author: null,
                content: "",
                metadata: "{}",
                createdAt: new Date(),
              },
            ],
          },
        ]),
      },
    };

    const w = await findPossibleDuplicateTitleWarnings(
      prisma as never,
      "u1",
      "Hello World",
      { excludeSongId: "same" },
    );
    expect(w).toEqual([]);
  });
});

describe("buildSongCreationWarnings", () => {
  it("merges duplicate and metadata warnings", async () => {
    const prisma = {
      song: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "s1",
            recommendedVersionId: null,
            recommendedVersion: null,
            versions: [
              {
                id: "v1",
                title: "One Title",
                author: null,
                content: "",
                metadata: "{}",
                createdAt: new Date(),
              },
            ],
          },
        ]),
      },
    };

    const w = await buildSongCreationWarnings(
      prisma as never,
      "u1",
      {
        title: "One Title",
        author: "",
        metadata: {},
      },
    );
    expect(w.length).toBeGreaterThanOrEqual(2);
    expect(w.some((x) => x.code === "possible_duplicate_titles")).toBe(true);
    expect(w.some((x) => x.code === "metadata_missing_author")).toBe(true);
  });
});
