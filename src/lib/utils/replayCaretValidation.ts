import { CHORD_WORD_RE } from "./chordWord";
import {
  detectSectionLabel,
  isChordLineType,
  tokenizeChordLine,
} from "./sngParser";

function isStrictChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  return words.length > 0 && words.every((w) => CHORD_WORD_RE.test(w));
}

/**
 * Uses the same chord-line heuristic as the .sng parser, but lines that
 * contain `^` must be strict chord-only rows; otherwise lyric lines with many
 * replay markers are misclassified as chord lines.
 */
function isChordLineForMemorization(line: string): boolean {
  if (!isChordLineType(line)) {
    return false;
  }
  if (countReplayCaretsInLyricLine(line) === 0) {
    return true;
  }
  return isStrictChordLine(line);
}

export type ReplayCaretIssueKind = "replay_no_chords" | "too_many_replay_carets";

export interface ReplayCaretIssue {
  /** 1-based line number in the full song text (including header if present) */
  lineNumber: number;
  kind: ReplayCaretIssueKind;
  caretCount: number;
  memorizedChordSlots: number;
}

/**
 * Counts `^` replay markers in a lyric line. The LaTeX songs package treats each
 * `^` as a chord replay; syllable breaks like `be^halt` add a replay with no
 * matching memorized chord.
 */
export function countReplayCaretsInLyricLine(line: string): number {
  let n = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "^") {
      n++;
    }
  }
  return n;
}

/**
 * Returns how many chord slots a chord line memorizes for replay, or `null` if
 * the line only repeats the previous chord line (`^`, `^ ^`, etc.).
 */
export function countChordSlotsOnChordLine(chordLine: string): number | null {
  const trimmed = chordLine.trim();
  if (!trimmed) {
    return null;
  }
  const tokens = tokenizeChordLine(chordLine);
  if (tokens.length === 0) {
    return 0;
  }
  if (tokens.every((t) => t.value === "^")) {
    return null;
  }
  return tokens.length;
}

/**
 * Finds lyric lines where `^` appears more often than the songs package has
 * chord slots memorized (from the last explicit chord line), which triggers
 * "Replayed chord has no matching chord" at PDF time.
 */
export function validateReplayCarets(content: string): ReplayCaretIssue[] {
  const lines = content.split("\n");
  const sepIdx = lines.findIndex((l) => l.trim() === "***");
  const hasHeader = sepIdx !== -1;
  const bodyLines = hasHeader ? lines.slice(sepIdx + 1) : lines;
  const bodyStartLine1 = hasHeader ? sepIdx + 2 : 1;

  let memorizedSlots = 0;
  const issues: ReplayCaretIssue[] = [];

  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i];
    const lineNumber = bodyStartLine1 + i;

    if (line.trim() === "") {
      continue;
    }
    if (detectSectionLabel(line)) {
      continue;
    }

    if (isChordLineForMemorization(line)) {
      const slots = countChordSlotsOnChordLine(line);
      if (slots !== null) {
        memorizedSlots = slots;
      }
      continue;
    }

    const caretCount = countReplayCaretsInLyricLine(line);
    if (caretCount === 0) {
      continue;
    }

    if (memorizedSlots === 0) {
      issues.push({
        lineNumber,
        kind: "replay_no_chords",
        caretCount,
        memorizedChordSlots: memorizedSlots,
      });
    } else if (caretCount > memorizedSlots) {
      issues.push({
        lineNumber,
        kind: "too_many_replay_carets",
        caretCount,
        memorizedChordSlots: memorizedSlots,
      });
    }
  }

  return issues;
}

/**
 * User-facing text for one replay-caret issue (PDF guard and editor notice).
 */
export function formatReplayCaretIssue(issue: ReplayCaretIssue): string {
  if (issue.kind === "replay_no_chords") {
    return `Line ${issue.lineNumber}: ${issue.caretCount} replay marker(s) (^) but no chord line memorizes chords yet.`;
  }
  return (
    `Line ${issue.lineNumber}: ${issue.caretCount} replay marker(s) (^), but only ${issue.memorizedChordSlots} chord slot(s) are memorized (from the last chord line). ` +
    `The last chord-only line above sets how many ^ you can use on this lyric line. Every ^ counts, including syllable splits (e.g. er^kannt, hö^ren). ` +
    `Remove one ^, join a word (e.g. erkannt instead of er^kannt), or add another chord to that chord row if the music needs it.`
  );
}

export function formatReplayCaretSummary(issues: ReplayCaretIssue[]): string {
  if (issues.length === 0) {
    return "";
  }
  return issues.map((issue) => formatReplayCaretIssue(issue)).join("\n");
}
