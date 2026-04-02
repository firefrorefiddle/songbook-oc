import { describe, expect, it } from 'vitest';

import { buildSongPreviewPayload, canGenerateSongPreview } from '$lib/songEditorPreview';

describe('songEditorPreview', () => {
  it('requires both title and content before generating a preview', () => {
    expect(
      canGenerateSongPreview({
        title: '  ',
        author: 'Author',
        content: 'Lyrics',
        metadata: {}
      })
    ).toBe(false);

    expect(
      canGenerateSongPreview({
        title: 'Title',
        author: 'Author',
        content: '  ',
        metadata: {}
      })
    ).toBe(false);

    expect(
      canGenerateSongPreview({
        title: 'Title',
        author: 'Author',
        content: 'Lyrics',
        metadata: {}
      })
    ).toBe(true);
  });

  it('trims the title while preserving the rest of the preview payload', () => {
    expect(
      buildSongPreviewPayload({
        title: '  Title  ',
        author: 'Author',
        content: 'C G\nLyrics',
        metadata: { copyright: '2026' }
      })
    ).toEqual({
      title: 'Title',
      author: 'Author',
      content: 'C G\nLyrics',
      metadata: { copyright: '2026' }
    });
  });
});
