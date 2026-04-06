import { describe, expect, it } from "vitest";

import {
  buildSongListWhere,
  songCategoryFilterOptionsWhere,
  songTagFilterOptionsWhere,
  visibleSongScopeWhere,
} from "./songListQuery";

describe("songListQuery", () => {
  it("visibleSongScopeWhere applies archive and OR visibility", () => {
    expect(visibleSongScopeWhere("u1", false)).toEqual({
      isArchived: false,
      OR: [
        { ownerId: "u1" },
        { collaborations: { some: { userId: "u1" } } },
        { isPublic: true },
      ],
    });
    expect(visibleSongScopeWhere("u1", true).isArchived).toBeUndefined();
  });

  it("buildSongListWhere adds search, tag, and category filters", () => {
    expect(
      buildSongListWhere({
        userId: "u1",
        includeArchived: false,
        search: "",
        tagId: null,
        categoryId: null,
      }),
    ).toEqual(visibleSongScopeWhere("u1", false));

    expect(
      buildSongListWhere({
        userId: "u1",
        includeArchived: false,
        search: "hello",
        tagId: "tag-1",
        categoryId: "cat-1",
      }),
    ).toEqual({
      ...visibleSongScopeWhere("u1", false),
      versions: { some: { title: { contains: "hello" } } },
      tags: { some: { tagId: "tag-1" } },
      categories: { some: { categoryId: "cat-1" } },
    });
  });

  it("songTagFilterOptionsWhere nests visible scope under song relation", () => {
    expect(songTagFilterOptionsWhere("u1", false)).toEqual({
      songs: {
        some: {
          song: visibleSongScopeWhere("u1", false),
        },
      },
    });
  });

  it("songCategoryFilterOptionsWhere nests visible scope under song relation", () => {
    expect(songCategoryFilterOptionsWhere("u1", false)).toEqual({
      songs: {
        some: {
          song: visibleSongScopeWhere("u1", false),
        },
      },
    });
  });
});
