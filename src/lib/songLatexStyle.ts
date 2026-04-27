/** How songmaker-cli maps .sng → TeX and which LaTeX support files belong in the job directory. */

export const SONG_LATEX_STYLES = ["songs_sty", "songbook_tex"] as const;
export type SongLatexStyle = (typeof SONG_LATEX_STYLES)[number];

export const DEFAULT_SONG_LATEX_STYLE: SongLatexStyle = "songs_sty";

export function parseSongLatexStyle(value: unknown): SongLatexStyle {
  return value === "songbook_tex" ? "songbook_tex" : "songs_sty";
}

/** Pass `--songssty` to songmaker-cli when emitting `songs.sty` / `\beginsong` format. */
export function songmakerUsesSongsStyFlag(style: SongLatexStyle): boolean {
  return style === "songs_sty";
}
