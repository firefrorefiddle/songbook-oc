import { describe, expect, it } from "vitest";

import { normalizeTaxonomyLabel } from "./songTaxonomyMutations";

describe("normalizeTaxonomyLabel", () => {
  it("trims and collapses spaces", () => {
    expect(normalizeTaxonomyLabel("  a  b  ")).toBe("a b");
  });

  it("returns null for empty input", () => {
    expect(normalizeTaxonomyLabel("   ")).toBeNull();
  });

  it("returns null when longer than 120 characters", () => {
    expect(normalizeTaxonomyLabel("x".repeat(121))).toBeNull();
  });

  it("accepts 120 characters", () => {
    expect(normalizeTaxonomyLabel("x".repeat(120))).toHaveLength(120);
  });
});
