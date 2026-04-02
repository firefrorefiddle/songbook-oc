export interface SongPreviewInput {
  title: string;
  author: string;
  content: string;
  metadata: Record<string, string>;
}

export function canGenerateSongPreview({ title, content }: SongPreviewInput): boolean {
  return Boolean(title.trim() && content.trim());
}

export function buildSongPreviewPayload(input: SongPreviewInput): SongPreviewInput {
  return {
    title: input.title.trim(),
    author: input.author,
    content: input.content,
    metadata: input.metadata
  };
}
