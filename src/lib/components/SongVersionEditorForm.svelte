<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import AdvancedSongEditor from '$lib/components/AdvancedSongEditor.svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import MetadataEditor from '$lib/components/MetadataEditor.svelte';
  import {
    buildSongPreviewPayload,
    canGenerateSongPreview,
    normalizeSongPreviewApiError,
    songPreviewErrorHeading
  } from '$lib/songEditorPreview';
  import {
    formatSongPdfPipelineIssues,
    validateSongPdfPipelineInput
  } from '$lib/utils/songPdfPipelineSafety';
  import { DEFAULT_SONG_LATEX_STYLE, type SongLatexStyle } from '$lib/songLatexStyle';

  const PREVIEW_LATEX_STYLE_KEY = 'songbook-oc-preview-latex-style';

  type EnhanceSubmit = Parameters<typeof enhance>[1];

  type Props = {
    action: string;
    error?: string;
    title?: string;
    author?: string;
    content?: string;
    metadata?: Record<string, string>;
    submitLabel: string;
    onCancel: () => void;
    enhanceSubmit?: EnhanceSubmit;
  };

  let {
    action,
    error = '',
    title = $bindable(''),
    author = $bindable(''),
    content = $bindable(''),
    metadata = $bindable({}),
    submitLabel,
    onCancel,
    enhanceSubmit
  }: Props = $props();

  let useAdvancedEditor = $state(false);
  let previewLatexStyle = $state<SongLatexStyle>(DEFAULT_SONG_LATEX_STYLE);
  let previewPng = $state<string | null>(null);
  let previewError = $state<{ stage: string; message: string; logs?: string } | null>(null);
  let isGeneratingPreview = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    try {
      const stored = localStorage.getItem(PREVIEW_LATEX_STYLE_KEY);
      previewLatexStyle = stored === 'songbook_tex' ? 'songbook_tex' : 'songs_sty';
    } catch {
      /* private mode */
    }
  });

  $effect(() => {
    const style = previewLatexStyle;
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(PREVIEW_LATEX_STYLE_KEY, style);
    } catch {
      /* ignore */
    }
  });

  let pdfPipelineNotice = $derived(
    formatSongPdfPipelineIssues(
      validateSongPdfPipelineInput({
        title,
        author,
        content,
        metadata
      })
    )
  );

  async function generatePreview(
    currentContent: string,
    currentTitle: string,
    currentAuthor: string,
    currentMetadata: Record<string, string>,
    currentLatexStyle: SongLatexStyle
  ) {
    const previewInput = {
      content: currentContent,
      title: currentTitle,
      author: currentAuthor,
      metadata: currentMetadata,
    };

    if (!canGenerateSongPreview(previewInput)) {
      previewPng = null;
      previewError = null;
      return;
    }

    isGeneratingPreview = true;

    try {
      const response = await fetch('/api/songs/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          buildSongPreviewPayload({ ...previewInput, latexStyle: currentLatexStyle })
        )
      });
    const responseData = await response.json();

    if (responseData.error) {
      previewError = normalizeSongPreviewApiError(responseData.error);
      previewPng = null;
      return;
    }

    previewError = null;
    if (!response.ok) {
      previewError = {
        stage: 'unknown',
        message: `Preview request failed (${response.status})`
      };
      previewPng = null;
      return;
    }
    previewPng = responseData.png ?? null;
    } catch (error) {
      console.error('Preview error:', error);
      previewPng = null;
      previewError = {
        stage: 'unknown',
        message: error instanceof Error ? error.message : 'Preview failed'
      };
    } finally {
      isGeneratingPreview = false;
    }
  }

  $effect(() => {
    const currentContent = content;
    const currentTitle = title;
    const currentAuthor = author;
    const currentMetadata = metadata;
    const currentLatexStyle = previewLatexStyle;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      void generatePreview(
        currentContent,
        currentTitle,
        currentAuthor,
        currentMetadata,
        currentLatexStyle,
      );
    }, 300);

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
    };
  });
</script>

<div class="flex gap-6 items-stretch h-full -m-6">
  <div class="flex-1 min-w-0 flex flex-col p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">Editor</h2>
      <div class="flex gap-2">
        <button
          type="button"
          class="px-3 py-1 rounded text-sm {!useAdvancedEditor
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-200 hover:bg-gray-300'}"
          onclick={() => (useAdvancedEditor = false)}
        >
          Text Editor
        </button>
        <button
          type="button"
          class="px-3 py-1 rounded text-sm {useAdvancedEditor
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-200 hover:bg-gray-300'}"
          onclick={() => (useAdvancedEditor = true)}
        >
          Advanced Editor
        </button>
      </div>
    </div>

    <form method="POST" {action} use:enhance={enhanceSubmit} class="flex-1 flex flex-col">
      {#if error}
        <div class="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      {/if}

      {#if pdfPipelineNotice}
        <div
          class="mb-4 p-3 bg-amber-50 text-amber-950 rounded-md text-sm border border-amber-200"
          role="status"
        >
          <div class="font-medium mb-1">PDF and song file checks</div>
          <p class="text-sm whitespace-pre-wrap">
            Some inputs break the PDF pipeline (songmaker / LaTeX): line breaks or control characters in
            titles or metadata, missing <code class="bg-amber-100 px-1 rounded">***</code> in raw song files, or
            ChordPro replay markers (<code class="bg-amber-100 px-1 rounded">^</code>) that do not match the last chord-only line above that lyric.
            Each <code class="bg-amber-100 px-1 rounded">^</code> replays one chord from that row, including syllable splits such as
            <code class="bg-amber-100 px-1 rounded">be^halt</code> or <code class="bg-amber-100 px-1 rounded">er^kannt</code>.
          </p>
          <p class="mt-2 text-sm font-mono whitespace-pre-wrap">{pdfPipelineNotice}</p>
        </div>
      {/if}

      <Input label="Title" id="title" required bind:value={title} />
      <Input label="Author" id="author" bind:value={author} />

      {#if useAdvancedEditor}
        <input type="hidden" name="content" value={content} />
        <div class="flex-1 min-h-0">
          <AdvancedSongEditor
            content={content}
            onContentChange={(newContent) => {
              content = newContent;
            }}
          />
        </div>
      {:else}
        <Input
          label="Content"
          id="content"
          type="textarea"
          rows={30}
          required
          bind:value={content}
          class="font-mono"
        />
      {/if}

      <MetadataEditor bind:metadata={metadata} />

      <div class="flex justify-end gap-2 mt-6">
        <Button variant="secondary" onclick={onCancel}>Cancel</Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  </div>

  <div class="w-3/5 bg-gray-50 p-6 flex flex-col">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
      <h3 class="text-sm font-medium text-gray-700">Preview</h3>
      <fieldset class="flex flex-wrap items-center gap-3 text-xs text-gray-600 border-0 p-0 m-0">
        <legend class="sr-only">LaTeX style for preview</legend>
        <span class="font-medium text-gray-700 not-sr-only">Style</span>
        <label class="inline-flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name="preview-latex-style" value="songs_sty" bind:group={previewLatexStyle} />
          <span>Legacy (songs.sty)</span>
        </label>
        <label class="inline-flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name="preview-latex-style" value="songbook_tex" bind:group={previewLatexStyle} />
          <span>Songbook layout</span>
        </label>
      </fieldset>
    </div>
    <div class="flex-1 flex items-center justify-center overflow-auto">
      {#if isGeneratingPreview}
        <div class="text-gray-400">Generating preview...</div>
      {:else if previewError}
        <div class="text-center p-4">
          <div class="text-red-600 font-medium mb-2">
            {songPreviewErrorHeading(previewError.stage)}
          </div>
          <div class="text-gray-700 text-sm mb-3 whitespace-pre-wrap font-mono">{previewError.message}</div>
          {#if previewError.logs}
            <details class="text-left" open={previewError.stage === 'pdflatex'}>
              <summary class="text-sm text-gray-500 cursor-pointer hover:text-gray-700">Full LaTeX log</summary>
              <pre class="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-64 text-gray-600">{previewError.logs}</pre>
            </details>
          {/if}
        </div>
      {:else if previewPng}
        <img
          src={previewPng}
          alt="Song preview"
          class="max-h-full object-contain border border-gray-200 rounded"
        />
      {:else}
        <div class="text-gray-400 text-sm">Start typing to see preview</div>
      {/if}
    </div>
  </div>
</div>
