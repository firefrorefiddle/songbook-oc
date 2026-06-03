import { describe, it, expect } from "vitest";
import {
  buildNativeSongbookIndex,
  buildSongbookTocLatex,
  escapeLatexForSongbookToc,
  songbookIndexLetter,
} from "./songbookPdf";

describe("escapeLatexForSongbookToc", () => {
  it("escapes LaTeX special characters", () => {
    expect(escapeLatexForSongbookToc("A & B%")).toBe("A \\& B\\%");
    expect(escapeLatexForSongbookToc("$#_{}"))
      .toBe("\\$\\#\\_\\{\\}");
    expect(escapeLatexForSongbookToc("a\\b")).toBe("a\\textbackslash{}b");
    expect(escapeLatexForSongbookToc("~^")).toBe(
      "\\textasciitilde{}\\textasciicircum{}",
    );
  });

  it("leaves plain text unchanged", () => {
    expect(escapeLatexForSongbookToc("Halleluja")).toBe("Halleluja");
  });
});

describe("buildSongbookTocLatex", () => {
  it("uses song package anchors and songtocline", () => {
    const latex = buildSongbookTocLatex([
      { order: 0, songVersion: { title: "First" } },
      { order: 1, songVersion: { title: "Second & Co." } },
    ]);
    expect(latex).toContain("\\songbooktocheading");
    expect(latex).toContain("\\songtocline{song1-1}{First}{1}");
    expect(latex).toContain("\\songtocline{song1-2}{Second \\& Co.}{2}");
  });
});

describe("songbookIndexLetter", () => {
  it("uppercases the first letter", () => {
    expect(songbookIndexLetter("above all")).toBe("A");
    expect(songbookIndexLetter("Zünde an")).toBe("Z");
  });

  it("folds German diacritics to the base letter", () => {
    expect(songbookIndexLetter("Über allem")).toBe("U");
    expect(songbookIndexLetter("Ärger")).toBe("A");
    expect(songbookIndexLetter("Öl")).toBe("O");
  });

  it("buckets non-letters under #", () => {
    expect(songbookIndexLetter("3 kleine Worte")).toBe("#");
    expect(songbookIndexLetter("''Quote''")).toBe("#");
    expect(songbookIndexLetter("   ")).toBe("#");
  });
});

describe("buildNativeSongbookIndex", () => {
  it("sorts titles alphabetically and groups by gray letter box", () => {
    const latex = buildNativeSongbookIndex([
      { order: 0, songVersion: { title: "Zünde an" } },
      { order: 1, songVersion: { title: "Above All" } },
      { order: 2, songVersion: { title: "Amazing Grace" } },
      { order: 3, songVersion: { title: "Bist du da" } },
    ]);
    expect(latex).toContain("\\songbooktocheading");
    expect(latex).toContain("\\begin{songtocindex}");
    expect(latex).toContain("\\end{songtocindex}");

    // Letter sections appear in alphabetical order.
    const aPos = latex.indexOf("\\songtocletter{A}");
    const bPos = latex.indexOf("\\songtocletter{B}");
    const zPos = latex.indexOf("\\songtocletter{Z}");
    expect(aPos).toBeGreaterThan(-1);
    expect(bPos).toBeGreaterThan(aPos);
    expect(zPos).toBeGreaterThan(bPos);

    // Numbers reflect the original songbook position (1-based), not sort order.
    expect(latex).toContain("\\songtocline{2}{Above All}{2}");
    expect(latex).toContain("\\songtocline{3}{Amazing Grace}{3}");
    expect(latex).toContain("\\songtocline{4}{Bist du da}{4}");
    expect(latex).toContain("\\songtocline{1}{Zünde an}{1}");

    // "Above All" (song 2) precedes "Amazing Grace" (song 3) alphabetically.
    expect(latex.indexOf("{Above All}")).toBeLessThan(
      latex.indexOf("{Amazing Grace}"),
    );
  });

  it("escapes LaTeX specials in titles", () => {
    const latex = buildNativeSongbookIndex([
      { order: 0, songVersion: { title: "Rock & Roll" } },
    ]);
    expect(latex).toContain("\\songtocline{1}{Rock \\& Roll}{1}");
  });
});
