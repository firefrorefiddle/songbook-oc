export type DuplicateTitleMatchKind = "normalized" | "fuzzy";

export interface DuplicateTitleMatch {
  songId: string;
  versionTitle: string;
  matchKind: DuplicateTitleMatchKind;
}

/** After create/fork, warnings may be passed through sessionStorage for the next page load. */
export const SONG_CREATE_WARNINGS_SESSION_KEY = "songbook.oc.songCreateWarnings";

export type SongCreationWarning =
  | {
      code: "possible_duplicate_titles";
      severity: "warning";
      message: string;
      matches: DuplicateTitleMatch[];
    }
  | {
      code: "metadata_missing_author";
      severity: "warning";
      message: string;
    }
  | {
      code: "metadata_missing_copyright";
      severity: "warning";
      message: string;
    };
