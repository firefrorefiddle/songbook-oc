/**
 * Placeholder substitution for `layout.tex` (songbook PDFs, scrbook) and preview drivers
 * (extarticle + geometry). Both ship @@PAPERSIZE@@ and @@FONTSIZE@@ tokens.
 */

import {
  DEFAULT_SONG_LATEX_STYLE,
  parseSongLatexStyle,
  type SongLatexStyle,
} from "$lib/songLatexStyle";

export type { SongLatexStyle };

export interface OutputSettings {
  mode: "chorded" | "text-only" | "overhead";
  fontSize: "small" | "medium" | "large" | "extra-large";
  paperSize: "a4" | "a5" | "letter";
  /** `overhead` PDFs always use `songs.sty`; see `effectiveLatexStyle`. */
  latexStyle: SongLatexStyle;
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

const OUTPUT_DEFAULTS: OutputSettings = {
  mode: "chorded",
  fontSize: "medium",
  paperSize: "a4",
  latexStyle: DEFAULT_SONG_LATEX_STYLE,
};

export function parseOutputSettings(json: string): OutputSettings {
  try {
    const parsed = JSON.parse(json || "{}") as Partial<OutputSettings>;
    return {
      mode: parsed.mode ?? OUTPUT_DEFAULTS.mode,
      fontSize: parsed.fontSize ?? OUTPUT_DEFAULTS.fontSize,
      paperSize: parsed.paperSize ?? OUTPUT_DEFAULTS.paperSize,
      latexStyle: parseSongLatexStyle(parsed.latexStyle),
    };
  } catch {
    return { ...OUTPUT_DEFAULTS };
  }
}

/** Songbook PDF + songmaker flags: overhead mode is tied to `songs` / slides layout only. */
export function effectiveLatexStyle(settings: OutputSettings): SongLatexStyle {
  if (settings.mode === "overhead") {
    return "songs_sty";
  }
  return settings.latexStyle;
}

/** Defaults for server-side PNG preview (`preview-song*.tex` + extarticle). */
export const PREVIEW_OUTPUT_SETTINGS: Pick<OutputSettings, "fontSize" | "paperSize"> = {
  fontSize: "medium",
  paperSize: "a4",
};
