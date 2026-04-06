import { describe, expect, it } from "vitest";

import {
  PUBLIC_BIO_MAX_LENGTH,
  parsePublicBioInput,
} from "./publicProfile";

describe("parsePublicBioInput", () => {
  it("accepts null and undefined as clear", () => {
    expect(parsePublicBioInput(null)).toEqual({ ok: true, value: null });
    expect(parsePublicBioInput(undefined)).toEqual({ ok: true, value: null });
  });

  it("trims and accepts in-range text", () => {
    expect(parsePublicBioInput("  hello  ")).toEqual({
      ok: true,
      value: "hello",
    });
  });

  it("maps whitespace-only to clear", () => {
    expect(parsePublicBioInput("   \n\t  ")).toEqual({
      ok: true,
      value: null,
    });
  });

  it("rejects non-string input", () => {
    const r = parsePublicBioInput(42);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/text/i);
  });

  it("rejects text over max length", () => {
    const r = parsePublicBioInput("a".repeat(PUBLIC_BIO_MAX_LENGTH + 1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(String(PUBLIC_BIO_MAX_LENGTH));
  });

  it("accepts text exactly at max length", () => {
    const s = "a".repeat(PUBLIC_BIO_MAX_LENGTH);
    expect(parsePublicBioInput(s)).toEqual({ ok: true, value: s });
  });
});
