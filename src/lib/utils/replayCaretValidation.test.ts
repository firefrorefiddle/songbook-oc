import { describe, expect, it } from "vitest";

import {
  countChordSlotsOnChordLine,
  formatReplayCaretSummary,
  validateReplayCarets,
} from "./replayCaretValidation";

describe("countChordSlotsOnChordLine", () => {
  it("counts tokens on an explicit chord line", () => {
    expect(countChordSlotsOnChordLine("C    F    d G")).toBe(4);
  });

  it("returns null for a line that only repeats previous chords", () => {
    expect(countChordSlotsOnChordLine("^")).toBe(null);
    expect(countChordSlotsOnChordLine("  ^  ^  ")).toBe(null);
  });

  it("counts mixed explicit and ^ tokens", () => {
    expect(countChordSlotsOnChordLine("C ^ F")).toBe(3);
  });
});

describe("validateReplayCarets", () => {
  it("reports no issues for empty body", () => {
    expect(validateReplayCarets("")).toEqual([]);
  });

  it("allows replay markers when enough chords are memorized", () => {
    const content = [
      "title: T",
      "reference:",
      "***",
      "C    F    C",
      "Halleluja, lobet Gott,",
      "",
      "^Lobet ^ihn mit ^den Posaunen,",
    ].join("\n");
    expect(validateReplayCarets(content)).toEqual([]);
  });

  it("flags syllable-style carets with no memorized chords", () => {
    const content = ["title: T", "reference:", "***", "be^halt"].join("\n");
    const issues = validateReplayCarets(content);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.kind).toBe("replay_no_chords");
    expect(issues[0]?.caretCount).toBe(1);
  });

  it("flags too many replay markers vs memorized slots", () => {
    const content = [
      "title: T",
      "reference:",
      "***",
      "C",
      "one two three four ^ five six seven eight ^ nine ten eleven twelve ^",
    ].join("\n");
    const issues = validateReplayCarets(content);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.kind).toBe("too_many_replay_carets");
    expect(issues[0]?.caretCount).toBe(3);
    expect(issues[0]?.memorizedChordSlots).toBe(1);
  });

  it("keeps memorized slots across blank lines", () => {
    const content = [
      "***",
      "C F",
      "first line",
      "",
      "^ ^",
      "second line",
    ].join("\n");
    expect(validateReplayCarets(content)).toEqual([]);
  });

  it("treats German chord symbols (H, fis, cis, …) as a chord line for memorized slots", () => {
    const content = [
      "title: T",
      "reference:",
      "***",
      "     fis           H           E H cis",
      "Alle Menschen, sie werden dich s-e-hen.",
      "^ ^ ^ ^ ^",
    ].join("\n");
    expect(validateReplayCarets(content)).toEqual([]);
  });

  it("flags a lyric line with five ^ when the prior chord row has four slots (chorus replay limit)", () => {
    const content = [
      "title: T",
      "reference:",
      "***",
      "D          e A       D",
      "Jesus, wir sehen auf dich.",
      "",
      "Und wir ^haben er^kannt, du bist ^Chr^is^tus.",
    ].join("\n");
    const issues = validateReplayCarets(content);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.kind).toBe("too_many_replay_carets");
    expect(issues[0]?.caretCount).toBe(5);
    expect(issues[0]?.memorizedChordSlots).toBe(4);
    expect(issues[0]?.lineNumber).toBe(7);
  });

  it("accepts that line after removing one syllable ^ (erkannt vs er^kannt)", () => {
    const content = [
      "title: T",
      "reference:",
      "***",
      "D          e A       D",
      "Jesus, wir sehen auf dich.",
      "",
      "Und wir ^haben erkannt, du bist ^Chr^is^tus.",
    ].join("\n");
    expect(validateReplayCarets(content)).toEqual([]);
  });
});

describe("formatReplayCaretSummary", () => {
  it("returns empty string when there are no issues", () => {
    expect(formatReplayCaretSummary([])).toBe("");
  });

  it("lists issues", () => {
    const summary = formatReplayCaretSummary([
      {
        lineNumber: 5,
        kind: "replay_no_chords",
        caretCount: 1,
        memorizedChordSlots: 0,
      },
    ]);
    expect(summary).toContain("Line 5");
    expect(summary).toContain("no chord line memorizes");
  });
});
