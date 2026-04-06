import { describe, expect, it } from "vitest";

import {
  buildSongListWhere,
  normalizeSongListSearch,
  songCategoryFilterOptionsWhere,
  songTagFilterOptionsWhere,
  songVersionTextSearchWhere,
  visibleSongScopeWhere,
} from "./songListQuery";

describe("songListQuery", () => {
  it("normalizeSongListSearch trims and leaves inner spaces", () => {
    expect(normalizeSongListSearch("  foo bar  ")).toBe("foo bar");
  });

  it("normalizeSongListSearch returns empty for whitespace-only input", () => {
    expect(normalizeSongListSearch("   \t  ")).toBe("");
  });

  it("songVersionTextSearchWhere matches title, author, content, or metadata", () => {
    expect(songVersionTextSearchWhere("hello")).toEqual({
      OR: [
        { title: { contains: "hello" } },
        { author: { contains: "hello" } },
        { content: { contains: "hello" } },
        { metadata: { contains: "hello" } },
      ],
    });
  });

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
        search: "   ",
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
      versions: { some: songVersionTextSearchWhere("hello") },
      tags: { some: { tagId: "tag-1" } },
      categories: { some: { categoryId: "cat-1" } },
    });
  });

  it("buildSongListWhere trims search before applying version filter", () => {
    expect(
      buildSongListWhere({
        userId: "u1",
        includeArchived: false,
        search: "  needle  ",
        tagId: null,
        categoryId: null,
      }),
    ).toEqual({
      ...visibleSongScopeWhere("u1", false),
      versions: { some: songVersionTextSearchWhere("needle") },
    });
  });

  it("buildSongListWhere ANDs text search with tag and category constraints", () => {
    const w = buildSongListWhere({
      userId: "u1",
      includeArchived: false,
      search: "x",
      tagId: "t1",
      categoryId: "c1",
    });
    expect(w.versions).toEqual({ some: songVersionTextSearchWhere("x") });
    expect(w.tags).toEqual({ some: { tagId: "t1" } });
    expect(w.categories).toEqual({ some: { categoryId: "c1" } });
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
