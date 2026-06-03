/**
 * Pure, UI-agnostic helpers for the graphical (advanced) song editor.
 *
 * The editor keeps an in-memory {@link SongSection} model and serializes it to
 * `.sng` on every change. Keeping the mutation logic here (instead of inside the
 * Svelte component) makes the chord-placement rules unit-testable and keeps
 * business logic out of the view, per the repo architecture rules.
 *
 * Character offsets are plain UTF-16 string indices so they line up with the
 * `.sng` parser/serializer in `sngParser.ts`.
 */
import type { ChordedLine, SongSection } from "./sngParser";

/** Clamp a character index into the addressable range of a lyrics line. */
export function clampCharIndex(lyrics: string, index: number): number {
  if (lyrics.length === 0) return 0;
  if (index < 0) return 0;
  if (index > lyrics.length - 1) return lyrics.length - 1;
  return index;
}

/**
 * End index of the word that starts at (or contains) `start`. Used so a chord
 * highlights the whole syllable/word it sits over, matching the PDF output.
 */
export function wordEndAt(lyrics: string, start: number): number {
  for (let i = start; i < lyrics.length; i++) {
    if (lyrics[i].trim() === "") {
      return i - 1;
    }
  }
  return Math.max(start, lyrics.length - 1);
}

/**
 * Place (or replace) a chord at an exact character position. Returns true when a
 * chord was added/updated, false when the chord name was blank. Mutates `line`.
 */
export function placeChord(
  line: ChordedLine,
  charIndex: number,
  chord: string,
  isOptional = false,
): boolean {
  const value = chord.trim();
  if (!value) return false;

  const startChar = clampCharIndex(line.lyrics, charIndex);
  const placement = {
    chord: value,
    startChar,
    endChar: wordEndAt(line.lyrics, startChar),
    isOptional,
  };

  const existing = line.chords.findIndex((c) => c.startChar === startChar);
  if (existing >= 0) {
    line.chords[existing] = placement;
  } else {
    line.chords.push(placement);
  }
  line.chords.sort((a, b) => a.startChar - b.startChar);
  return true;
}

/** Nudge a chord left/right by `delta` characters, clamped to the line. Mutates `line`. */
export function moveChord(line: ChordedLine, chordIndex: number, delta: number): void {
  const chord = line.chords[chordIndex];
  if (!chord) return;
  chord.startChar = clampCharIndex(line.lyrics, chord.startChar + delta);
  chord.endChar = wordEndAt(line.lyrics, chord.startChar);
  line.chords.sort((a, b) => a.startChar - b.startChar);
}

/** Remove a chord by index. Mutates `line`. */
export function removeChord(line: ChordedLine, chordIndex: number): void {
  if (chordIndex < 0 || chordIndex >= line.chords.length) return;
  line.chords.splice(chordIndex, 1);
}

/**
 * Re-anchor a line's chords after its lyrics text changed so no chord points
 * past the end of the (possibly shorter) line. Mutates `line`.
 */
export function syncChordsToLyrics(line: ChordedLine): void {
  if (line.lyrics.length === 0) {
    line.chords = [];
    return;
  }
  for (const chord of line.chords) {
    chord.startChar = clampCharIndex(line.lyrics, chord.startChar);
    chord.endChar = wordEndAt(line.lyrics, chord.startChar);
  }
}

/** Distinct chord names already used across the song, in first-seen order. */
export function usedChords(sections: SongSection[]): string[] {
  const seen = new Set<string>();
  for (const section of sections) {
    for (const line of section.lines) {
      for (const chord of line.chords) {
        if (chord.chord !== "^") seen.add(chord.chord);
      }
    }
  }
  return [...seen];
}

/** A reasonable default set of common chords for the quick-insert palette. */
export const COMMON_CHORDS = [
  "C",
  "D",
  "E",
  "F",
  "G",
  "A",
  "Am",
  "Dm",
  "Em",
  "G7",
  "D7",
  "A7",
  "E7",
  "C7",
] as const;

/**
 * Palette of chords for one-click insertion: chords already used in the song
 * first, then common chords, de-duplicated and capped for a tidy toolbar.
 */
export function chordPaletteForSong(sections: SongSection[], limit = 14): string[] {
  const palette = usedChords(sections);
  for (const chord of COMMON_CHORDS) {
    if (!palette.includes(chord)) palette.push(chord);
  }
  return palette.slice(0, limit);
}

/** Human-friendly tab/heading label for a section. */
export function sectionDisplayLabel(
  section: Pick<SongSection, "type" | "label">,
  verseNumber: number,
): string {
  const custom = section.label?.trim();
  switch (section.type) {
    case "refrain":
      return custom || "Refrain";
    case "bridge":
      return custom || "Bridge";
    case "custom":
      return custom || "Section";
    case "verse":
    default:
      return `Verse ${verseNumber}`;
  }
}
