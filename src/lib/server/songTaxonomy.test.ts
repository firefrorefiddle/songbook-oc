import { describe, expect, it } from "vitest";

import {
  buildCollectionCategoryIndex,
  inferSongTaxonomy,
  normaliseSongFilename,
} from "./songTaxonomy";

describe("buildCollectionCategoryIndex", () => {
  it("maps songbook source files to configured categories", () => {
    const index = buildCollectionCategoryIndex({
      "jugend_songs.tex":
        "\\input{lieder/no_longer_i}\n\\input{lieder/as_the_deer}",
      "gemeinde_songs.tex": "\\input{lieder/as_the_deer}",
      "loben_songs.tex": "\\input{lieder/no_longer_i}",
    });

    expect(index.get("no_longer_i")).toEqual(["Praise", "Youth"]);
    expect(index.get("as_the_deer")).toEqual(["Community", "Youth"]);
  });
});

describe("inferSongTaxonomy", () => {
  it("preserves imported collection categories and infers English tags", () => {
    const taxonomy = inferSongTaxonomy({
      filename: "no_longer_i.sng",
      title: "No Longer I",
      content: "No longer I that live, but Christ in me and you are my song.",
      collectionCategories: ["Youth"],
    });

    expect(taxonomy.categories).toEqual(["Youth"]);
    expect(taxonomy.tags).toContain("English");
  });

  it("infers German and seasonal tags from song text", () => {
    const taxonomy = inferSongTaxonomy({
      filename: "ich_steh_an_deiner_krippe_hier.sng",
      title: "Ich steh an deiner Krippe hier",
      content:
        "Herr, ich komme zu deiner Krippe in der Weihnacht und wir loben dich.",
    });

    expect(taxonomy.tags).toEqual(
      expect.arrayContaining(["Christmas", "German"]),
    );
  });

  it("infers communion keywords from metadata and lyrics", () => {
    const taxonomy = inferSongTaxonomy({
      filename: "table_song.sng",
      title: "At Your Table",
      content: "We share the bread and cup before the Lord.",
      metadata: { reference: "Communion service" },
    });

    expect(taxonomy.tags).toContain("Communion");
  });
});

describe("normaliseSongFilename", () => {
  it("normalises mixed-case song filenames", () => {
    expect(normaliseSongFilename("Jesus_Will_Uns_Bau'n.sng")).toBe(
      "jesus_will_uns_bau'n",
    );
  });
});
