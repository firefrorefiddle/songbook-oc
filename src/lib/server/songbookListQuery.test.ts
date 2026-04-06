import { describe, expect, it, vi } from "vitest";

import {
  buildSongbookListWhere,
  findSongbookIdsMatchingLatestVersionTaxonomy,
  visibleSongbookScopeWhere,
} from "./songbookListQuery";

describe("songbookListQuery", () => {
  it("visibleSongbookScopeWhere applies archive and OR visibility", () => {
    expect(visibleSongbookScopeWhere("u1", false)).toEqual({
      isArchived: false,
      OR: [
        { ownerId: "u1" },
        { collaborations: { some: { userId: "u1" } } },
        { isPublic: true },
      ],
    });
    expect(visibleSongbookScopeWhere("u1", true).isArchived).toBeUndefined();
  });

  it("buildSongbookListWhere adds search and taxonomy id restriction", () => {
    expect(
      buildSongbookListWhere({
        userId: "u1",
        includeArchived: false,
        search: "",
        taxonomySongbookIds: null,
      }),
    ).toEqual(visibleSongbookScopeWhere("u1", false));

    expect(
      buildSongbookListWhere({
        userId: "u1",
        includeArchived: false,
        search: "hymn",
        taxonomySongbookIds: ["sb-a", "sb-b"],
      }),
    ).toEqual({
      ...visibleSongbookScopeWhere("u1", false),
      versions: { some: { title: { contains: "hymn" } } },
      id: { in: ["sb-a", "sb-b"] },
    });
  });

  it("findSongbookIdsMatchingLatestVersionTaxonomy returns [] when no filters", async () => {
    const prisma = { $queryRaw: vi.fn() };
    await expect(
      findSongbookIdsMatchingLatestVersionTaxonomy(prisma as never, {
        tagId: null,
        categoryId: null,
      }),
    ).resolves.toEqual([]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});
