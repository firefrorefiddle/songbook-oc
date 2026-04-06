import { describe, it, expect } from "vitest";
import {
  buildSongbookTocLatex,
  escapeLatexForSongbookToc,
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
