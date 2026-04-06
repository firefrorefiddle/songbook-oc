import { describe, expect, it } from "vitest";

import {
  buildSongContentForPdf,
  escapeStructuredHeaderFieldForSng,
  formatSongPdfPipelineIssues,
  normalizeSongPipelineText,
  validateSongPdfPipelineInput,
} from "./songPdfPipelineSafety";

describe("songPdfPipelineSafety", () => {
  describe("normalizeSongPipelineText", () => {
    it("normalizes CRLF and strips NUL", () => {
      expect(normalizeSongPipelineText("a\r\nb\0c")).toBe("a\nbc");
    });

    it("drops other C0 controls except tab and newline", () => {
      expect(normalizeSongPipelineText("a\u0001b\tc\nd")).toBe("ab\tc\nd");
    });
  });

  describe("escapeStructuredHeaderFieldForSng", () => {
    it("escapes LaTeX-special characters for songmaker headers", () => {
      expect(escapeStructuredHeaderFieldForSng("Smith & Co. 100%")).toBe(
        "Smith \\& Co. 100\\%",
      );
      expect(escapeStructuredHeaderFieldForSng("a$b_c#{}~^\\")).toBe(
        "a\\$b\\_c\\#\\{\\}\\~{}\\^{}\\textbackslash{}",
      );
    });
  });

  describe("buildSongContentForPdf", () => {
    it("escapes structured title and metadata in generated .sng", () => {
      const sng = buildSongContentForPdf(
        "R&S",
        "C\nLine",
        "Author & Tester",
        { copyright: "50%" },
      );
      expect(sng).toContain("title: R\\&S\n");
      expect(sng).toContain("author: Author \\& Tester\n");
      expect(sng).toContain("copyright: 50\\%\n");
      expect(sng).toContain("***\nC\nLine");
    });

    it("passes raw .sng through after normalization only", () => {
      const raw = "title: X\r\nauthor:\nreference:\n***\nC\nx\n";
      const sng = buildSongContentForPdf("ignored", raw, null, {});
      expect(sng).toBe(normalizeSongPipelineText(raw));
      expect(sng).toContain("title: X");
    });
  });

  describe("validateSongPdfPipelineInput", () => {
    it("accepts a happy-path structured song", () => {
      expect(
        validateSongPdfPipelineInput({
          title: "Psalm",
          author: "A",
          content: "C\nPraise",
          metadata: { copyright: "CC0" },
        }),
      ).toEqual([]);
    });

    it("rejects multiline title", () => {
      const issues = validateSongPdfPipelineInput({
        title: "a\nb",
        author: null,
        content: "C\nx",
        metadata: {},
      });
      expect(issues.some((i) => i.code === "header_multiline")).toBe(true);
    });

    it("rejects NUL in metadata", () => {
      const issues = validateSongPdfPipelineInput({
        title: "T",
        author: null,
        content: "C\nx",
        metadata: { copyright: "a\0b" },
      });
      expect(issues.some((i) => i.code === "nul_byte")).toBe(true);
    });

    it("flags raw .sng without *** separator", () => {
      const issues = validateSongPdfPipelineInput({
        title: "unused",
        author: null,
        content: "title: X\nauthor:\n",
        metadata: {},
      });
      expect(issues.some((i) => i.code === "raw_sng_missing_separator")).toBe(
        true,
      );
    });

    it("validates replay carets on structured body", () => {
      const issues = validateSongPdfPipelineInput({
        title: "T",
        author: null,
        content: "be^halt",
        metadata: {},
      });
      expect(issues.some((i) => i.code === "replay_no_chords")).toBe(true);
    });

    it("validates replay carets on raw body after ***", () => {
      const issues = validateSongPdfPipelineInput({
        title: "unused",
        author: null,
        content: "title: T\nauthor:\nreference:\n***\nbe^halt",
        metadata: {},
      });
      expect(issues.some((i) => i.code === "replay_no_chords")).toBe(true);
    });
  });

  describe("formatSongPdfPipelineIssues", () => {
    it("returns empty string when there are no issues", () => {
      expect(formatSongPdfPipelineIssues([])).toBe("");
    });

    it("joins messages with newlines", () => {
      const text = formatSongPdfPipelineIssues([
        { code: "header_multiline", message: "Title bad" },
        { code: "replay_no_chords", message: "Line 3: broken" },
      ]);
      expect(text).toBe("Title bad\nLine 3: broken");
    });
  });
});
