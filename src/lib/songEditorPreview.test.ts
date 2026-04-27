import { describe, expect, it } from 'vitest';

import {
  buildSongPreviewPayload,
  canGenerateSongPreview,
  normalizeSongPreviewApiError,
  songPreviewErrorHeading,
} from "$lib/songEditorPreview";
import { DEFAULT_SONG_LATEX_STYLE } from "$lib/songLatexStyle";

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

  it('normalizes API error payloads for the editor', () => {
    expect(normalizeSongPreviewApiError('Content is required')).toEqual({
      stage: 'validation',
      message: 'Content is required'
    });
    expect(
      normalizeSongPreviewApiError({
        stage: 'pdflatex',
        message: '! LaTeX Error: badness',
        logs: 'full log…'
      })
    ).toEqual({
      stage: 'pdflatex',
      message: '! LaTeX Error: badness',
      logs: 'full log…'
    });
    expect(songPreviewErrorHeading('pdflatex')).toBe('LaTeX / PDF error');
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
      metadata: { copyright: '2026' },
      latexStyle: DEFAULT_SONG_LATEX_STYLE,
    });
  });
});
