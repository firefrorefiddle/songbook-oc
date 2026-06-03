<script lang="ts">
  import { tick, untrack } from 'svelte';
  import type { ParsedSng, SongSection } from '$lib/utils/sngParser';
  import { parseSng, buildSng } from '$lib/utils/sngParser';
  import {
    chordPaletteForSong,
    clampCharIndex,
    moveChord,
    placeChord,
    removeChord,
    sectionDisplayLabel,
    syncChordsToLyrics,
    wordEndAt
  } from '$lib/utils/advancedEditorModel';

  type Props = {
    content: string;
    onContentChange: (_c: string) => void;
  };

  let { content: _content, onContentChange }: Props = $props();

  function safeParse(content: string): ParsedSng {
    try {
      const parsed = parseSng(content);
      if (!parsed.metadata) parsed.metadata = { title: '' };
      return parsed;
    } catch {
      return { metadata: { title: '' }, sections: [] };
    }
  }

  // The editor owns an in-memory model and only serializes outward. We never
  // re-parse our own output (that would re-snap chord positions on every
  // keystroke), so editing is stable; we only re-parse when `content` changes
  // externally (e.g. the user switched from the text editor).
  let model = $state<ParsedSng>(safeParse(_content));
  let lastSerialized = $state(_content);
  let currentSectionIndex = $state(0);

  type ChordEditor = {
    lineIndex: number;
    charIndex: number;
    value: string;
    isOptional: boolean;
    mode: 'add' | 'edit';
    chordIndex: number | null;
  };
  let chordEditor = $state<ChordEditor | null>(null);
  let lyricInputs = $state<HTMLInputElement[]>([]);

  $effect(() => {
    const incoming = _content;
    untrack(() => {
      if (incoming !== lastSerialized) {
        model = safeParse(incoming);
        lastSerialized = incoming;
        if (currentSectionIndex >= model.sections.length) {
          currentSectionIndex = Math.max(0, model.sections.length - 1);
        }
      }
    });
  });

  let palette = $derived(chordPaletteForSong(model.sections));
  let verseNumbers = $derived.by(() => {
    let n = 0;
    return model.sections.map((s) => (s.type === 'verse' ? ++n : 0));
  });

  function commit() {
    const out = buildSng(model.metadata, model.sections);
    lastSerialized = out;
    onContentChange(out);
  }

  function getCurrentSection(): SongSection | null {
    return model.sections[currentSectionIndex] ?? null;
  }

  function charCells(lyrics: string): { index: number; display: string }[] {
    const cells: { index: number; display: string }[] = [];
    for (let i = 0; i < lyrics.length; i++) {
      cells.push({ index: i, display: lyrics[i] === ' ' ? '\u00A0' : lyrics[i] });
    }
    return cells;
  }

  function openAddChord(lineIndex: number, charIndex: number) {
    const line = getCurrentSection()?.lines[lineIndex];
    if (!line || line.lyrics.length === 0) return;
    const existing = line.chords.findIndex((c) => c.startChar === charIndex);
    if (existing >= 0) {
      openEditChord(lineIndex, existing);
      return;
    }
    chordEditor = {
      lineIndex,
      charIndex,
      value: '',
      isOptional: false,
      mode: 'add',
      chordIndex: null
    };
  }

  function openEditChord(lineIndex: number, chordIndex: number) {
    const chord = getCurrentSection()?.lines[lineIndex]?.chords[chordIndex];
    if (!chord) return;
    chordEditor = {
      lineIndex,
      charIndex: chord.startChar,
      value: chord.chord,
      isOptional: chord.isOptional,
      mode: 'edit',
      chordIndex
    };
  }

  function confirmChord() {
    if (!chordEditor) return;
    const line = getCurrentSection()?.lines[chordEditor.lineIndex];
    if (!line) {
      chordEditor = null;
      return;
    }

    if (chordEditor.mode === 'edit' && chordEditor.chordIndex !== null) {
      const value = chordEditor.value.trim();
      if (!value) {
        removeChord(line, chordEditor.chordIndex);
      } else {
        const chord = line.chords[chordEditor.chordIndex];
        if (chord) {
          chord.chord = value;
          chord.isOptional = chordEditor.isOptional;
        }
      }
    } else {
      placeChord(line, chordEditor.charIndex, chordEditor.value, chordEditor.isOptional);
    }

    commit();
    chordEditor = null;
  }

  function removeCurrentChord() {
    if (!chordEditor || chordEditor.chordIndex === null) {
      chordEditor = null;
      return;
    }
    const line = getCurrentSection()?.lines[chordEditor.lineIndex];
    if (line) {
      removeChord(line, chordEditor.chordIndex);
      commit();
    }
    chordEditor = null;
  }

  function nudgeCurrentChord(delta: number) {
    if (!chordEditor || chordEditor.chordIndex === null) return;
    const line = getCurrentSection()?.lines[chordEditor.lineIndex];
    if (!line) return;
    const chord = line.chords[chordEditor.chordIndex];
    if (!chord) return;
    moveChord(line, chordEditor.chordIndex, delta);
    chordEditor.chordIndex = line.chords.indexOf(chord);
    chordEditor.charIndex = chord.startChar;
    commit();
  }

  function insertPaletteChord(chord: string) {
    if (!chordEditor) return;
    chordEditor.value = chord;
    confirmChord();
  }

  function updateLyrics(lineIndex: number, value: string) {
    const line = getCurrentSection()?.lines[lineIndex];
    if (!line) return;
    line.lyrics = value;
    syncChordsToLyrics(line);
    commit();
  }

  async function addLineAfter(lineIndex: number) {
    const section = getCurrentSection();
    if (!section) return;
    section.lines.splice(lineIndex + 1, 0, {
      lyrics: '',
      chords: [],
      usePreviousChords: section.repeatChordsFromPrevious
    });
    commit();
    await tick();
    lyricInputs[lineIndex + 1]?.focus();
  }

  async function addFirstLine() {
    const section = getCurrentSection();
    if (!section) return;
    section.lines.push({ lyrics: '', chords: [], usePreviousChords: section.repeatChordsFromPrevious });
    commit();
    await tick();
    lyricInputs[section.lines.length - 1]?.focus();
  }

  async function removeLine(lineIndex: number) {
    const section = getCurrentSection();
    if (!section) return;
    section.lines.splice(lineIndex, 1);
    if (chordEditor?.lineIndex === lineIndex) chordEditor = null;
    commit();
    await tick();
    lyricInputs[Math.max(0, lineIndex - 1)]?.focus();
  }

  function handleLyricKeydown(event: KeyboardEvent, lineIndex: number, lyrics: string) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void addLineAfter(lineIndex);
    } else if (event.key === 'Backspace' && lyrics.length === 0 && lineIndex > 0) {
      event.preventDefault();
      void removeLine(lineIndex);
    }
  }

  function addSection(type: SongSection['type'] = 'verse') {
    model.sections.push({
      type,
      label: type === 'custom' ? '' : undefined,
      lines: [],
      repeatChordsFromPrevious: false
    });
    currentSectionIndex = model.sections.length - 1;
    chordEditor = null;
    commit();
  }

  function removeSection(index: number) {
    if (model.sections.length === 0) return;
    model.sections.splice(index, 1);
    if (currentSectionIndex >= model.sections.length) {
      currentSectionIndex = Math.max(0, model.sections.length - 1);
    }
    chordEditor = null;
    commit();
  }

  function setSectionType(type: SongSection['type']) {
    const section = getCurrentSection();
    if (!section) return;
    section.type = type;
    if (type !== 'custom') section.label = undefined;
    else if (section.label === undefined) section.label = '';
    commit();
  }

  function setSectionLabel(label: string) {
    const section = getCurrentSection();
    if (!section) return;
    section.label = label;
    commit();
  }

  function toggleRepeatChords() {
    const section = getCurrentSection();
    if (!section) return;
    section.repeatChordsFromPrevious = !section.repeatChordsFromPrevious;
    for (const line of section.lines) {
      line.usePreviousChords = section.repeatChordsFromPrevious;
    }
    commit();
  }

  function applyHeuristicFromPrevious() {
    const section = getCurrentSection();
    if (!section || currentSectionIndex === 0) return;
    const prev = model.sections[currentSectionIndex - 1];
    if (!prev || prev.lines.length === 0) return;

    section.repeatChordsFromPrevious = false;
    for (let i = 0; i < section.lines.length; i++) {
      const line = section.lines[i];
      const prevLine = prev.lines[Math.min(i, prev.lines.length - 1)];
      const prevChords = prevLine?.chords ?? [];
      line.usePreviousChords = false;
      line.chords = prevChords.map((c) => {
        const startChar = clampCharIndex(line.lyrics, c.startChar);
        return {
          chord: c.chord,
          startChar,
          endChar: wordEndAt(line.lyrics, startChar),
          isOptional: c.isOptional
        };
      });
    }
    commit();
  }

  function focusOnMount(node: HTMLInputElement) {
    node.focus();
    node.select();
  }
</script>

<div class="flex flex-col h-full text-gray-800">
  <!-- Section tabs -->
  <div class="flex flex-wrap items-center gap-2 mb-3">
    {#each model.sections as section, idx (idx)}
      <div
        class="flex items-center rounded-md overflow-hidden border {idx === currentSectionIndex
          ? 'border-indigo-600'
          : 'border-gray-300'}"
      >
        <button
          type="button"
          class="px-3 py-1 text-sm {idx === currentSectionIndex
            ? 'bg-indigo-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100'}"
          onclick={() => {
            currentSectionIndex = idx;
            chordEditor = null;
          }}
        >
          {sectionDisplayLabel(section, verseNumbers[idx])}
        </button>
        <button
          type="button"
          class="px-2 py-1 text-sm {idx === currentSectionIndex
            ? 'bg-indigo-600 text-indigo-100 hover:text-white'
            : 'bg-white text-gray-400 hover:text-red-600'}"
          onclick={() => removeSection(idx)}
          aria-label={`Remove ${sectionDisplayLabel(section, verseNumbers[idx])}`}
          title="Remove section"
        >
          ×
        </button>
      </div>
    {/each}
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="px-3 py-1 rounded-md text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onclick={() => addSection('verse')}
      >
        + Verse
      </button>
      <button
        type="button"
        class="px-3 py-1 rounded-md text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onclick={() => addSection('refrain')}
      >
        + Refrain
      </button>
    </div>
  </div>

  <div class="flex-1 overflow-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
    {#if model.sections.length === 0}
      <div class="text-center py-12">
        <p class="text-gray-600 mb-1 font-medium">Start your song</p>
        <p class="text-gray-500 text-sm mb-4 max-w-md mx-auto">
          Add a verse, type the lyrics, then click any letter to drop a chord exactly above it —
          no need to line up spaces by hand.
        </p>
        <button
          type="button"
          class="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onclick={() => addSection('verse')}
        >
          + Add first verse
        </button>
      </div>
    {:else if getCurrentSection()}
      {@const section = getCurrentSection()}
      <!-- Section controls -->
      <div class="flex flex-wrap items-center gap-3 mb-4 pb-3 border-b border-gray-200">
        <div class="flex items-center gap-2">
          <label for="section-type" class="text-sm font-medium text-gray-700">Type</label>
          <select
            id="section-type"
            class="px-2 py-1 border border-gray-300 rounded text-sm focus:border-indigo-500 focus:ring-indigo-500"
            value={section?.type}
            onchange={(e) => setSectionType(e.currentTarget.value as SongSection['type'])}
          >
            <option value="verse">Verse</option>
            <option value="refrain">Refrain</option>
            <option value="bridge">Bridge</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        {#if section?.type === 'custom'}
          <input
            type="text"
            class="px-2 py-1 border border-gray-300 rounded text-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Label (e.g. Intro)"
            value={section?.label ?? ''}
            oninput={(e) => setSectionLabel(e.currentTarget.value)}
          />
        {/if}
        <label class="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            checked={section?.repeatChordsFromPrevious}
            onchange={toggleRepeatChords}
            disabled={currentSectionIndex === 0}
          />
          Same chords as previous section
        </label>
        {#if currentSectionIndex > 0}
          <button
            type="button"
            class="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onclick={applyHeuristicFromPrevious}
            title="Copy the previous section's chord positions onto these lyrics so you can fine-tune them"
          >
            Copy chords from previous
          </button>
        {/if}
      </div>

      {#if section?.lines.length === 0}
        <div class="text-center py-6 text-gray-500 text-sm">
          No lines yet.
          <button
            type="button"
            class="ml-1 text-indigo-600 hover:text-indigo-800 underline"
            onclick={addFirstLine}
          >
            Add a line
          </button>
        </div>
      {/if}

      {#each section?.lines ?? [] as line, lineIdx (lineIdx)}
        <div class="mb-3 p-3 bg-white border border-gray-200 rounded-lg">
          <div class="flex items-center justify-between mb-1">
            {#if line.usePreviousChords}
              <span class="text-xs text-indigo-600">↻ Uses chords from the previous section</span>
            {:else}
              <span class="text-xs text-gray-400">Click a letter to add a chord above it</span>
            {/if}
            <button
              type="button"
              class="text-xs text-gray-400 hover:text-red-600"
              onclick={() => removeLine(lineIdx)}
            >
              Remove line
            </button>
          </div>

          {#if !line.usePreviousChords}
            <div class="overflow-x-auto pb-1">
              <div class="relative font-mono text-base" style="width: max-content; min-width: 100%;">
                <!-- Chord track. The positioning span inherits the lyric row's
                     font size so `Nch` lines up with the lyric letters below. -->
                <div class="relative h-6 text-base">
                  {#each line.chords as chord, chordIdx (chordIdx)}
                    <span class="absolute bottom-0" style="left: {chord.startChar}ch;">
                      <button
                        type="button"
                        class="block leading-none pr-1 rounded text-sm font-semibold whitespace-nowrap select-none {chordEditor?.lineIndex ===
                          lineIdx && chordEditor?.chordIndex === chordIdx
                          ? 'bg-indigo-600 text-white'
                          : 'text-indigo-600 hover:bg-indigo-100'}"
                        onclick={() => openEditChord(lineIdx, chordIdx)}
                        title="Edit or move chord"
                      >
                        {chord.isOptional ? `(${chord.chord})` : chord.chord}
                      </button>
                    </span>
                  {/each}
                </div>
                <!-- Lyric letters (clickable) -->
                <div class="whitespace-nowrap leading-relaxed">
                  {#if line.lyrics.length === 0}<span class="text-gray-400 text-sm italic"
                      >(type lyrics below, then click a letter)</span
                    >{:else}{#each charCells(line.lyrics) as cell (cell.index)}<button
                        type="button"
                        class="inline-block w-[1ch] text-center align-baseline hover:bg-indigo-100 hover:rounded-sm focus:outline-none focus:bg-indigo-200 focus:rounded-sm {chordEditor?.lineIndex ===
                          lineIdx && chordEditor?.charIndex === cell.index
                          ? 'bg-indigo-200 rounded-sm'
                          : ''}"
                        onclick={() => openAddChord(lineIdx, cell.index)}
                        aria-label={`Add chord at position ${cell.index + 1}`}>{cell.display}</button
                      >{/each}{/if}
                </div>
              </div>
            </div>
          {/if}

          <!-- Inline chord editor -->
          {#if chordEditor && chordEditor.lineIndex === lineIdx}
            <div
              class="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 p-2"
            >
              <span class="text-xs text-indigo-900">
                {chordEditor.mode === 'edit' ? 'Edit chord' : 'New chord'} at position
                {chordEditor.charIndex + 1}
              </span>
              <input
                type="text"
                class="w-28 px-2 py-1 border border-gray-300 rounded text-sm font-mono focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="C, Am7, F#m"
                bind:value={chordEditor.value}
                use:focusOnMount
                onkeydown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmChord();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    chordEditor = null;
                  }
                }}
              />
              <label class="flex items-center gap-1 text-xs text-gray-700">
                <input
                  type="checkbox"
                  class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  bind:checked={chordEditor.isOptional}
                />
                optional ( )
              </label>
              {#if chordEditor.mode === 'edit'}
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    class="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
                    onclick={() => nudgeCurrentChord(-1)}
                    title="Move chord one character left"
                    aria-label="Move chord left">◀</button
                  >
                  <button
                    type="button"
                    class="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
                    onclick={() => nudgeCurrentChord(1)}
                    title="Move chord one character right"
                    aria-label="Move chord right">▶</button
                  >
                </div>
              {/if}
              <div class="flex flex-wrap items-center gap-1">
                {#each palette as paletteChord (paletteChord)}
                  <button
                    type="button"
                    class="px-1.5 py-0.5 text-xs bg-white border border-gray-300 rounded hover:bg-indigo-100 font-mono"
                    onclick={() => insertPaletteChord(paletteChord)}
                  >
                    {paletteChord}
                  </button>
                {/each}
              </div>
              <div class="ml-auto flex items-center gap-1">
                {#if chordEditor.mode === 'edit'}
                  <button
                    type="button"
                    class="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                    onclick={removeCurrentChord}
                  >
                    Remove
                  </button>
                {/if}
                <button
                  type="button"
                  class="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  onclick={() => (chordEditor = null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  onclick={confirmChord}
                >
                  {chordEditor.mode === 'edit' ? 'Save' : 'Add'}
                </button>
              </div>
            </div>
          {/if}

          <div class="mt-2">
            <input
              type="text"
              bind:this={lyricInputs[lineIdx]}
              class="w-full px-2 py-1 border border-gray-300 rounded text-sm font-mono focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Type lyrics… (Enter = new line)"
              value={line.lyrics}
              oninput={(e) => updateLyrics(lineIdx, e.currentTarget.value)}
              onkeydown={(e) => handleLyricKeydown(e, lineIdx, line.lyrics)}
            />
          </div>
        </div>
      {/each}

      {#if section && section.lines.length > 0}
        <button
          type="button"
          class="mt-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onclick={() => addLineAfter(section.lines.length - 1)}
        >
          + Add line
        </button>
      {/if}
    {/if}
  </div>
</div>
