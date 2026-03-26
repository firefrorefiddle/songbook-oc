import { describe, it, expect } from "vitest";
import {
  convertToLatex,
  renderPdf,
  renderPng,
  generatePreview,
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
      const latex = await convertToLatex(TEST_SONG);

      expect(latex).toContain("\\beginsong");
      expect(latex).toContain("Großer Gott");
    });
  });

  describe("renderPdf", () => {
    it("renders LaTeX to PDF", async () => {
      const latex = await convertToLatex(TEST_SONG);
      const pdfPath = await renderPdf(latex);

      expect(pdfPath).toContain(".pdf");
    });
  });

  describe("renderPng", () => {
    it("converts PDF to PNG base64", async () => {
      const latex = await convertToLatex(TEST_SONG);
      const pdfPath = await renderPdf(latex);
      const pngBase64 = await renderPng(pdfPath);

      expect(pngBase64).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe("generatePreview", () => {
    it("generates PNG preview from song content", async () => {
      const pngBase64 = await generatePreview(TEST_SONG);

      expect(pngBase64).toMatch(/^data:image\/png;base64,/);
      expect(pngBase64.length).toBeGreaterThan(10000);
    });
  });
});
