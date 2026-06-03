// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  DEFAULT_SONG_LATEX_STYLE,
  parseSongLatexStyle,
  songmakerUsesSongsStyFlag,
} from "$lib/songLatexStyle";

describe("songLatexStyle", () => {
  it("defaults to the new songbook_tex method", () => {
    expect(DEFAULT_SONG_LATEX_STYLE).toBe("songbook_tex");
  });

  it("falls back to the new default for empty/unknown values", () => {
    expect(parseSongLatexStyle(undefined)).toBe("songbook_tex");
    expect(parseSongLatexStyle(null)).toBe("songbook_tex");
    expect(parseSongLatexStyle("")).toBe("songbook_tex");
    expect(parseSongLatexStyle("nonsense")).toBe("songbook_tex");
    expect(parseSongLatexStyle({})).toBe("songbook_tex");
  });

  it("honors an explicit songs_sty value", () => {
    expect(parseSongLatexStyle("songs_sty")).toBe("songs_sty");
  });

  it("honors an explicit songbook_tex value", () => {
    expect(parseSongLatexStyle("songbook_tex")).toBe("songbook_tex");
  });

  it("passes --songssty only for songs_sty", () => {
    expect(songmakerUsesSongsStyFlag("songs_sty")).toBe(true);
    expect(songmakerUsesSongsStyFlag("songbook_tex")).toBe(false);
  });
});
