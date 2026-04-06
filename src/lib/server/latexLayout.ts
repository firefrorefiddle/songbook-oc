/**
 * Placeholder substitution for `layout.tex` (songbook PDFs, scrbook) and `preview-song.tex`
 * (PNG preview, extarticle). Both ship @@PAPERSIZE@@ and @@FONTSIZE@@ tokens.
 */

export interface OutputSettings {
  mode: "chorded" | "text-only" | "overhead";
  fontSize: "small" | "medium" | "large" | "extra-large";
  paperSize: "a4" | "a5" | "letter";
}

export const FONT_SIZE_MAP: Record<OutputSettings["fontSize"], number> = {
  small: 14,
  medium: 16,
  large: 20,
  "extra-large": 24,
};

export const PAPER_SIZE_MAP: Record<OutputSettings["paperSize"], string> = {
  a4: "a4paper",
  a5: "a5paper",
  letter: "letterpaper",
};

export function applyLayoutPlaceholders(
  layoutTexContent: string,
  settings: Pick<OutputSettings, "fontSize" | "paperSize">,
): string {
  const fontSize = FONT_SIZE_MAP[settings.fontSize];
  const paperSize = PAPER_SIZE_MAP[settings.paperSize];
  return layoutTexContent
    .replace(/@@FONTSIZE@@/g, fontSize.toString())
    .replace(/@@PAPERSIZE@@/g, paperSize);
}

/** Defaults for server-side PNG preview (`preview-song.tex` + extarticle). */
export const PREVIEW_OUTPUT_SETTINGS: Pick<OutputSettings, "fontSize" | "paperSize"> = {
  fontSize: "medium",
  paperSize: "a4",
};
