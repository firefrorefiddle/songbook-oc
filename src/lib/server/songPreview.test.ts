import { describe, it, expect } from "vitest";
import {
  convertToLatex,
  renderPdf,
  renderPng,
  generatePreview,
  isPreviewError,
} from "./songPreview";

const TEST_SONG = `title: Test Song
copyright: Public Domain
***
E                H     E               cis     A     H4  H
Großer Gott, wir loben dich! Herr, wir preisen deine Stärke!
Vor dir beugt die Erde sich und bewundert deine Werke.
fis    H7        E           A          H     A H7 E
Wie du warst vor aller Zeit, so bleibst du in E-wigkeit.`;

describe("songPreview", () => {
  describe("convertToLatex", () => {
    it("converts .sng content to LaTeX", async () => {
      const result = await convertToLatex(TEST_SONG);

      expect(isPreviewError(result)).toBe(false);
      if (!isPreviewError(result)) {
        expect(result).toContain("\\beginsong");
        expect(result).toContain("Großer Gott");
      }
    });
  });

  describe("renderPdf", () => {
    it("renders LaTeX to PDF", async () => {
      const latexResult = await convertToLatex(TEST_SONG);
      expect(isPreviewError(latexResult)).toBe(false);

      if (isPreviewError(latexResult)) return;
      const pdfResult = await renderPdf(latexResult);

      expect(isPreviewError(pdfResult)).toBe(false);
      if (!isPreviewError(pdfResult)) {
        expect(pdfResult).toContain(".pdf");
      }
    });
  });

  describe("renderPng", () => {
    it("converts PDF to PNG base64", async () => {
      const latexResult = await convertToLatex(TEST_SONG);
      expect(isPreviewError(latexResult)).toBe(false);

      if (isPreviewError(latexResult)) return;
      const pdfResult = await renderPdf(latexResult);
      expect(isPreviewError(pdfResult)).toBe(false);

      if (isPreviewError(pdfResult)) return;
      const pngBase64 = await renderPng(pdfResult);

      expect(pngBase64).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe("generatePreview", () => {
    it("generates PNG preview from song content", async () => {
      const result = await generatePreview(TEST_SONG);

      expect(result.error).toBeUndefined();
      expect(result.png).toBeDefined();
      if (result.png) {
        expect(result.png).toMatch(/^data:image\/png;base64,/);
        expect(result.png.length).toBeGreaterThan(10000);
      }
    });
  });
});
