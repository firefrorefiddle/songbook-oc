import { describe, expect, it } from "vitest";

import { buildSng, parseSng, type SongSection } from "./sngParser";

describe("parseSng", () => {
  it("parses headers and a chorded verse", () => {
    const sng = ["title: Test Song", "author: Someone", "***", "C       F", "Halleluja, lobet"].join(
      "\n",
    );
    const parsed = parseSng(sng);
    expect(parsed.metadata.title).toBe("Test Song");
    expect(parsed.metadata.author).toBe("Someone");
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0].lines[0].lyrics).toBe("Halleluja, lobet");
    expect(parsed.sections[0].lines[0].chords.length).toBeGreaterThan(0);
  });
});

describe("buildSng renderChordLine", () => {
  it("aligns a chord at the exact character column, even for short lyrics", () => {
    const sections: SongSection[] = [
      {
        type: "verse",
        lines: [
          {
            lyrics: "abc def",
            // chord sits over the 'd' (column 4)
            chords: [{ chord: "G", startChar: 4, endChar: 6, isOptional: false }],
            usePreviousChords: false,
          },
        ],
        repeatChordsFromPrevious: false,
      },
    ];

    const out = buildSng({ title: "T" }, sections);
    const lines = out.split("\n");
    const chordLine = lines.find((l) => l.includes("G"))!;
    expect(chordLine).toBe("    G");
    // The chord column lines up with the start of "def".
    expect(chordLine.indexOf("G")).toBe(4);
  });

  it("round-trips a placed chord back to the same word", () => {
    const sections: SongSection[] = [
      {
        type: "verse",
        lines: [
          {
            lyrics: "Halleluja, lobet Gott",
            chords: [{ chord: "F", startChar: 11, endChar: 15, isOptional: false }],
            usePreviousChords: false,
          },
        ],
        repeatChordsFromPrevious: false,
      },
    ];

    const reparsed = parseSng(buildSng({ title: "T" }, sections));
    const chords = reparsed.sections[0].lines[0].chords;
    expect(chords).toHaveLength(1);
    expect(chords[0].chord).toBe("F");
    // "lobet" starts at column 11.
    expect(chords[0].startChar).toBe(11);
  });
});
