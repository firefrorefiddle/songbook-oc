export interface SngMetadata {
  title: string;
  copyright?: string;
  author?: string;
  lyricsBy?: string;
  musicBy?: string;
  reference?: string;
  translationBy?: string;
  original?: string;
  numbering?: string;
  "extra-index"?: string;
}

export interface ChordPlacement {
  chord: string;
  startChar: number;
  endChar: number;
  isOptional: boolean;
}

export interface ChordedLine {
  lyrics: string;
  chords: ChordPlacement[];
  usePreviousChords: boolean;
}

export interface SongSection {
  type: "verse" | "refrain" | "bridge" | "custom";
  label?: string;
  lines: ChordedLine[];
  repeatChordsFromPrevious: boolean;
}

export interface ParsedSng {
  metadata: SngMetadata;
  sections: SongSection[];
}

export function parseSng(content: string): ParsedSng {
  const lines = content.split("\n");
  const metadata: Partial<SngMetadata> = {};
  const hasSeparator = lines.some((line) => line.trim() === "***");
  let contentStartIndex = -1;

  if (hasSeparator) {
    contentStartIndex = lines.findIndex((line) => line.trim() === "***");
  }

  if (hasSeparator) {
    for (let i = 0; i < contentStartIndex; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) continue;

      const key = line.slice(0, colonIndex).trim().toLowerCase();
      const value = line.slice(colonIndex + 1).trim();

      switch (key) {
        case "title":
          metadata.title = value;
          break;
        case "author":
          metadata.author = value;
          break;
        case "lyricsby":
          metadata.lyricsBy = value;
          break;
        case "musicby":
          metadata.musicBy = value;
          break;
        case "copyright":
          metadata.copyright = value;
          break;
        case "reference":
          metadata.reference = value;
          break;
        case "extra-index":
          metadata["extra-index"] = value;
          break;
        case "translationby":
          metadata.translationBy = value;
          break;
        case "original":
          metadata.original = value;
          break;
        case "numbering":
          metadata.numbering = value;
          break;
      }
    }
  }

  const bodyLines = hasSeparator ? lines.slice(contentStartIndex + 1) : lines;
  const sections = parseSections(bodyLines);

  return {
    metadata: metadata as SngMetadata,
    sections,
  };
}

function parseSections(lines: string[]): SongSection[] {
  const sections: SongSection[] = [];
  let currentSection: SongSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === "") {
      if (currentSection) {
        sections.push(currentSection);
        currentSection = null;
      }
      continue;
    }

    const isChordLine = isChordLineType(line);
    const isLabeledSection = detectSectionLabel(line);

    if (isLabeledSection) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = createSectionFromLabel(line);
      continue;
    }

    if (!currentSection) {
      currentSection = createDefaultSection();
    }

    if (isChordLine) {
      const nextLyricsIndex = findNextLyricsLine(lines, i);
      const lyricsLine = nextLyricsIndex !== -1 ? lines[nextLyricsIndex] : "";
      const chordedLine = parseChordLine(line, lyricsLine);
      currentSection.lines.push(chordedLine);
    } else if (
      currentSection.lines.length > 0 &&
      currentSection.lines[currentSection.lines.length - 1].chords.length > 0
    ) {
      const prevLine = currentSection.lines[currentSection.lines.length - 1];
      if (prevLine) {
        prevLine.lyrics = line;
        updateChordEndChars(prevLine);
      }
    } else {
      currentSection.lines.push({
        lyrics: line,
        chords: [],
        usePreviousChords: false,
      });
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

function isChordLineType(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return false;

  const chordPattern =
    /^(\^|[\dA-G][#b]?(|m|maj|min|dim|aug|sus[24]?|add[0-9]+|[0-9]+)?(\/[A-G][#b]?)?|\([^)]+\)|\[[^\]]+\]|\|[|:])$/;
  const chordLikeCount = words.filter(
    (w) =>
      chordPattern.test(w) ||
      w === "^" ||
      (w.match(/[\[\(]/) && w.match(/[\]\)]/)),
  );

  return chordLikeCount.length >= words.length * 0.3;
}

function findNextLyricsLine(lines: string[], startIndex: number): number {
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (lines[i].trim() === "") return -1;
    if (isChordLineType(lines[i])) return -1;
    return i;
  }
  return -1;
}

function parseChordLine(chordLine: string, lyricsLine: string): ChordedLine {
  const usePrevious = chordLine.trim().startsWith("^");

  if (usePrevious) {
    return {
      lyrics: lyricsLine,
      chords: [],
      usePreviousChords: true,
    };
  }

  const chords = extractChordPlacements(chordLine, lyricsLine);
  return {
    lyrics: lyricsLine,
    chords,
    usePreviousChords: false,
  };
}

function extractChordPlacements(
  chordLine: string,
  lyricsLine: string,
): ChordPlacement[] {
  const placements: ChordPlacement[] = [];
  const chordTokens = tokenizeChordLine(chordLine);

  if (chordTokens.length === 0 || !lyricsLine.trim()) {
    return [];
  }

  const words = getWordPositions(lyricsLine);

  for (let i = 0; i < chordTokens.length && i < words.length; i++) {
    const chord = chordTokens[i];
    const word = words[i];
    if (chord && word) {
      placements.push({
        chord: chord.value,
        startChar: word.start,
        endChar: word.end,
        isOptional: chord.isOptional,
      });
    }
  }

  return placements;
}

function getWordPositions(
  lyrics: string,
): { word: string; start: number; end: number }[] {
  const words: { word: string; start: number; end: number }[] = [];
  let current = "";
  let start = -1;

  for (let i = 0; i < lyrics.length; i++) {
    const char = lyrics[i];
    if (char.trim() === "") {
      if (current) {
        words.push({ word: current, start, end: i - 1 });
        current = "";
        start = -1;
      }
    } else {
      if (start === -1) start = i;
      current += char;
    }
  }

  if (current) {
    words.push({ word: current, start, end: lyrics.length - 1 });
  }

  return words;
}

interface ChordToken {
  value: string;
  isOptional: boolean;
}

function tokenizeChordLine(line: string): ChordToken[] {
  const tokens: ChordToken[] = [];
  const parts = line.trim().split(/\s+/);

  for (const part of parts) {
    if (!part) continue;

    const isOptional =
      (part.startsWith("(") && part.endsWith(")")) ||
      (part.startsWith("[") && part.endsWith("]"));

    const cleanPart = part.replace(/^[\[\(]|[\]\)]$/g, "");

    if (cleanPart !== "^" && cleanPart) {
      tokens.push({
        value: cleanPart,
        isOptional,
      });
    } else if (cleanPart === "^") {
      tokens.push({
        value: "^",
        isOptional: false,
      });
    }
  }

  return tokens;
}

function updateChordEndChars(line: ChordedLine): void {
  for (const chord of line.chords) {
    const remainingLyrics = line.lyrics.slice(chord.startChar);
    const match = remainingLyrics.match(/^[^a-zA-ZäöüÄÖÜß]*/);
    if (match) {
      chord.endChar = chord.startChar + match[0].length;
    }
  }
}

function detectSectionLabel(
  line: string,
): { type: SongSection["type"]; label?: string } | null {
  const trimmed = line.trim();

  if (trimmed.match(/^(Vers|Verse)\s*[\d:]?/i)) {
    return { type: "verse", label: trimmed };
  }
  if (
    trimmed.match(/^(Ref|Chorus|Reffrain)\s*[\d:]?/i) ||
    trimmed.startsWith("Ref.:")
  ) {
    return { type: "refrain", label: trimmed };
  }
  if (trimmed.match(/^(Bridge|Bridge:)\s*/i) || trimmed.startsWith("Bridge:")) {
    return { type: "bridge", label: trimmed };
  }

  return null;
}

function createSectionFromLabel(line: string): SongSection {
  const detected = detectSectionLabel(line);

  return {
    type: detected?.type || "custom",
    label: detected?.label || line,
    lines: [],
    repeatChordsFromPrevious: false,
  };
}

function createDefaultSection(): SongSection {
  return {
    type: "verse",
    lines: [],
    repeatChordsFromPrevious: false,
  };
}

export function buildSng(
  metadata: SngMetadata,
  sections: SongSection[],
): string {
  let output = "";

  if (metadata.title) {
    output += `title: ${metadata.title}\n`;
  }
  if (metadata.author) {
    output += `author: ${metadata.author}\n`;
  }
  if (metadata.copyright) {
    output += `copyright: ${metadata.copyright}\n`;
  }
  if (metadata.lyricsBy) {
    output += `lyricsBy: ${metadata.lyricsBy}\n`;
  }
  if (metadata.musicBy) {
    output += `musicBy: ${metadata.musicBy}\n`;
  }
  if (metadata.reference) {
    output += `reference: ${metadata.reference}\n`;
  }
  if (metadata.translationBy) {
    output += `translationBy: ${metadata.translationBy}\n`;
  }
  if (metadata.original) {
    output += `original: ${metadata.original}\n`;
  }
  if (metadata.numbering) {
    output += `numbering: ${metadata.numbering}\n`;
  }
  if (metadata["extra-index"]) {
    output += `extra-index: ${metadata["extra-index"]}\n`;
  }

  output += "***\n";

  for (const section of sections) {
    if (section.label) {
      output += `\n${section.label}\n`;
    }

    if (section.repeatChordsFromPrevious) {
      output += "^\n";
      for (const line of section.lines) {
        output += `${line.lyrics}\n`;
      }
    } else {
      for (const line of section.lines) {
        if (line.usePreviousChords) {
          output += "^\n";
        } else if (line.chords.length > 0) {
          const chordLine = renderChordLine(line);
          output += `${chordLine}\n`;
        }
        output += `${line.lyrics}\n`;
      }
    }

    output += "\n";
  }

  return output.trim() + "\n";
}

function renderChordLine(line: ChordedLine): string {
  if (line.chords.length === 0) {
    return "";
  }

  const lyricsChars = line.lyrics.split("");
  const result: { chord: string; isOptional: boolean }[] = [];

  let currentChordIndex = 0;
  let currentPos = 0;

  while (
    currentPos < lyricsChars.length &&
    currentChordIndex < line.chords.length
  ) {
    const chord = line.chords[currentChordIndex];

    while (currentPos < chord.startChar) {
      if (lyricsChars[currentPos].trim() === "") {
        result.push({ chord: "", isOptional: false });
      }
      currentPos++;
    }

    if (currentPos === chord.startChar) {
      result.push({ chord: chord.chord, isOptional: chord.isOptional });
      currentChordIndex++;
      currentPos = chord.endChar + 1;
    }
  }

  return result
    .map((item) => {
      if (!item.chord) return "";
      return item.isOptional ? `(${item.chord})` : item.chord;
    })
    .join(" ");
}
