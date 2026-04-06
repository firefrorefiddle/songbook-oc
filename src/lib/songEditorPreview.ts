export interface SongPreviewInput {
  title: string;
  author: string;
  content: string;
  metadata: Record<string, string>;
}

/** Normalized preview failure for the editor (API may return a string on older clients). */
export interface SongPreviewClientError {
  stage: string;
  message: string;
  logs?: string;
}

export function normalizeSongPreviewApiError(
  error: unknown,
): SongPreviewClientError {
  if (typeof error === "string") {
    return { stage: "validation", message: error };
  }
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    const e = error as SongPreviewClientError;
    return {
      stage: typeof e.stage === "string" ? e.stage : "unknown",
      message: e.message,
      logs: typeof e.logs === "string" ? e.logs : undefined,
    };
  }
  return { stage: "unknown", message: "Preview failed" };
}

export function canGenerateSongPreview({ title, content }: SongPreviewInput): boolean {
  return Boolean(title.trim() && content.trim());
}

export function songPreviewErrorHeading(stage: string): string {
  switch (stage) {
    case "songmaker":
      return "Song conversion error";
    case "pdflatex":
      return "LaTeX / PDF error";
    case "validation":
      return "Preview input";
    default:
      return "Preview error";
  }
}

export function buildSongPreviewPayload(input: SongPreviewInput): SongPreviewInput {
  return {
    title: input.title.trim(),
    author: input.author,
    content: input.content,
    metadata: input.metadata
  };
}
