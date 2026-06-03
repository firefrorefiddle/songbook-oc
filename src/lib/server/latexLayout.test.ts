// @vitest-environment node
import { describe, expect, it } from "vitest";

import { effectiveLatexStyle, parseOutputSettings } from "$lib/server/latexLayout";

describe("parseOutputSettings", () => {
  it("resolves empty settings to the new songbook_tex default", () => {
    expect(parseOutputSettings("{}").latexStyle).toBe("songbook_tex");
    expect(parseOutputSettings("").latexStyle).toBe("songbook_tex");
  });

  it("resolves unknown latexStyle to the new default", () => {
    expect(parseOutputSettings('{"latexStyle":"nonsense"}').latexStyle).toBe("songbook_tex");
  });

  it("honors an explicit songs_sty latexStyle", () => {
    expect(parseOutputSettings('{"latexStyle":"songs_sty"}').latexStyle).toBe("songs_sty");
  });

  it("falls back to defaults on invalid JSON", () => {
    expect(parseOutputSettings("not json").latexStyle).toBe("songbook_tex");
  });
});

describe("effectiveLatexStyle", () => {
  it("forces songs_sty for overhead mode regardless of latexStyle", () => {
    expect(
      effectiveLatexStyle({
        mode: "overhead",
        fontSize: "medium",
        paperSize: "a4",
        latexStyle: "songbook_tex",
      }),
    ).toBe("songs_sty");
  });

  it("passes through the configured latexStyle for non-overhead modes", () => {
    expect(
      effectiveLatexStyle({
        mode: "chorded",
        fontSize: "medium",
        paperSize: "a4",
        latexStyle: "songbook_tex",
      }),
    ).toBe("songbook_tex");
    expect(
      effectiveLatexStyle({
        mode: "text-only",
        fontSize: "medium",
        paperSize: "a4",
        latexStyle: "songs_sty",
      }),
    ).toBe("songs_sty");
  });
});
