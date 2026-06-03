import { describe, expect, it } from "vitest";

import {
  chordPaletteForSong,
  clampCharIndex,
  moveChord,
  placeChord,
  removeChord,
  sectionDisplayLabel,
  syncChordsToLyrics,
  usedChords,
  wordEndAt,
} from "./advancedEditorModel";
import type { ChordedLine, SongSection } from "./sngParser";

function makeLine(lyrics: string): ChordedLine {
  return { lyrics, chords: [], usePreviousChords: false };
}

describe("clampCharIndex", () => {
  it("keeps indices inside the line and handles empty lyrics", () => {
    expect(clampCharIndex("hello", -3)).toBe(0);
    expect(clampCharIndex("hello", 2)).toBe(2);
    expect(clampCharIndex("hello", 99)).toBe(4);
    expect(clampCharIndex("", 5)).toBe(0);
  });
});

describe("wordEndAt", () => {
  it("returns the end of the word containing the start index", () => {
    const lyrics = "Halleluja, lobet Gott";
    expect(wordEndAt(lyrics, 0)).toBe(9); // "Halleluja," ends at the comma
    expect(wordEndAt(lyrics, 11)).toBe(15); // "lobet"
  });

  it("supports sub-word placement (second syllable)", () => {
    const lyrics = "Heiligt-um";
    expect(wordEndAt(lyrics, 8)).toBe(9);
  });
});

describe("placeChord", () => {
  it("places a chord at the exact clicked character without counting spaces", () => {
    const line = makeLine("Halleluja, lobet Gott");
    expect(placeChord(line, 11, "F")).toBe(true);
    expect(line.chords).toEqual([
      { chord: "F", startChar: 11, endChar: 15, isOptional: false },
    ]);
  });

  it("keeps chords sorted by position", () => {
    const line = makeLine("one two three");
    placeChord(line, 8, "G");
    placeChord(line, 0, "C");
    placeChord(line, 4, "Am");
    expect(line.chords.map((c) => c.chord)).toEqual(["C", "Am", "G"]);
  });

  it("replaces an existing chord at the same position instead of duplicating", () => {
    const line = makeLine("one two");
    placeChord(line, 0, "C");
    placeChord(line, 0, "Cmaj7");
    expect(line.chords).toHaveLength(1);
    expect(line.chords[0].chord).toBe("Cmaj7");
  });

  it("rejects a blank chord name", () => {
    const line = makeLine("one");
    expect(placeChord(line, 0, "   ")).toBe(false);
    expect(line.chords).toHaveLength(0);
  });
});

describe("moveChord", () => {
  it("nudges a chord and clamps to the line bounds", () => {
    const line = makeLine("one two");
    placeChord(line, 4, "G");
    moveChord(line, 0, -1);
    expect(line.chords[0].startChar).toBe(3);
    moveChord(line, 0, -99);
    expect(line.chords[0].startChar).toBe(0);
    moveChord(line, 0, 99);
    expect(line.chords[0].startChar).toBe(6);
  });
});

describe("removeChord", () => {
  it("removes a chord by index and ignores out-of-range indices", () => {
    const line = makeLine("one two");
    placeChord(line, 0, "C");
    placeChord(line, 4, "G");
    removeChord(line, 5);
    expect(line.chords).toHaveLength(2);
    removeChord(line, 0);
    expect(line.chords.map((c) => c.chord)).toEqual(["G"]);
  });
});

describe("syncChordsToLyrics", () => {
  it("re-anchors chords when lyrics get shorter", () => {
    const line = makeLine("Halleluja, lobet");
    placeChord(line, 11, "F");
    line.lyrics = "Hall";
    syncChordsToLyrics(line);
    expect(line.chords[0].startChar).toBe(3);
    expect(line.chords[0].endChar).toBe(3);
  });

  it("drops chords when the line becomes empty", () => {
    const line = makeLine("hi");
    placeChord(line, 0, "C");
    line.lyrics = "";
    syncChordsToLyrics(line);
    expect(line.chords).toHaveLength(0);
  });
});

describe("usedChords + chordPaletteForSong", () => {
  const sections: SongSection[] = [
    {
      type: "verse",
      lines: [
        {
          lyrics: "one two",
          chords: [
            { chord: "C", startChar: 0, endChar: 2, isOptional: false },
            { chord: "G7", startChar: 4, endChar: 6, isOptional: false },
          ],
          usePreviousChords: false,
        },
      ],
      repeatChordsFromPrevious: false,
    },
  ];

  it("collects distinct used chords", () => {
    expect(usedChords(sections)).toEqual(["C", "G7"]);
  });

  it("puts used chords first, then common chords, de-duplicated", () => {
    const palette = chordPaletteForSong(sections);
    expect(palette.slice(0, 2)).toEqual(["C", "G7"]);
    expect(new Set(palette).size).toBe(palette.length);
    expect(palette.length).toBeLessThanOrEqual(14);
  });
});

describe("sectionDisplayLabel", () => {
  it("numbers verses and names other section types", () => {
    expect(sectionDisplayLabel({ type: "verse" }, 2)).toBe("Verse 2");
    expect(sectionDisplayLabel({ type: "refrain" }, 0)).toBe("Refrain");
    expect(sectionDisplayLabel({ type: "bridge" }, 0)).toBe("Bridge");
    expect(sectionDisplayLabel({ type: "custom", label: "Intro" }, 0)).toBe("Intro");
    expect(sectionDisplayLabel({ type: "custom", label: "  " }, 0)).toBe("Section");
  });
});
