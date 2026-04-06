import { describe, expect, it } from "vitest";

import { navigateRelative, parseInitialSlideIndex } from "./slideNavigation";

describe("parseInitialSlideIndex", () => {
  it("returns 0 when there are no slides", () => {
    expect(parseInitialSlideIndex("5", 0)).toBe(0);
    expect(parseInitialSlideIndex(null, 0)).toBe(0);
  });

  it("defaults to 0 when param is missing or invalid", () => {
    expect(parseInitialSlideIndex(null, 3)).toBe(0);
    expect(parseInitialSlideIndex(undefined, 3)).toBe(0);
    expect(parseInitialSlideIndex("  ", 3)).toBe(0);
    expect(parseInitialSlideIndex("abc", 3)).toBe(0);
  });

  it("clamps to valid range", () => {
    expect(parseInitialSlideIndex("-1", 3)).toBe(0);
    expect(parseInitialSlideIndex("99", 3)).toBe(2);
    expect(parseInitialSlideIndex("1", 3)).toBe(1);
  });
});

describe("navigateRelative", () => {
  it("returns 0 when there are no slides", () => {
    expect(navigateRelative(0, 1, 0)).toBe(0);
  });

  it("clamps at ends", () => {
    expect(navigateRelative(0, -1, 5)).toBe(0);
    expect(navigateRelative(4, 1, 5)).toBe(4);
    expect(navigateRelative(2, 1, 5)).toBe(3);
    expect(navigateRelative(2, -1, 5)).toBe(1);
  });
});
