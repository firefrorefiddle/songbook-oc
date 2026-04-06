import { describe, it, expect } from "vitest";
import { extractPdflatexUserMessage } from "./latexLog";

describe("extractPdflatexUserMessage", () => {
  it("extracts the first LaTeX error block", () => {
    const log = `
This is pdfTeX, Version 3.141592653-2.6-1.40.22
! Undefined control sequence.
l.12 ...\\foo
? 
`;
    expect(extractPdflatexUserMessage(log)).toContain("! Undefined control sequence");
    expect(extractPdflatexUserMessage(log)).toContain("l.12");
  });

  it("falls back to a tail slice when there is no ! line", () => {
    const log = "x".repeat(8000);
    const out = extractPdflatexUserMessage(log);
    expect(out.length).toBeLessThanOrEqual(6000 + 2);
    expect(out).toContain("…");
  });
});
