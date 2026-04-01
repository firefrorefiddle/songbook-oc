<script lang="ts">
  import type { SongSection, ChordPlacement } from '$lib/utils/sngParser';
  import { parseSng, buildSng } from '$lib/utils/sngParser';

  type Props = {
    content: string;
    onContentChange: (_c: string) => void;
  };

  let { content: _content, onContentChange }: Props = $props();

  let parsed = $derived.by(() => {
    try {
      return parseSng(_content);
    } catch {
      return { metadata: { title: '' }, sections: [] };
    }
  });

  let currentSectionIndex = $state(0);
  let showChordInput = $state(false);
  let newChordValue = $state('');
  let selectedCharIndex = $state<number | null>(null);

  function getCurrentSection(): SongSection | null {
    return parsed.sections[currentSectionIndex] || null;
  }

  function addChord(lineIndex: number, charIndex: number) {
    const section = getCurrentSection();
    if (!section) return;

    const line = section.lines[lineIndex];
    if (!line) return;

    selectedCharIndex = charIndex;
    showChordInput = true;
    newChordValue = '';
  }

  function confirmAddChord(lineIndex: number) {
    if (!newChordValue.trim() || selectedCharIndex === null) {
      showChordInput = false;
      return;
    }

    const section = getCurrentSection();
    if (!section) return;

    const line = section.lines[lineIndex];
    if (!line) return;

    const chord: ChordPlacement = {
      chord: newChordValue.trim(),
      startChar: selectedCharIndex,
      endChar: findWordEnd(line.lyrics, selectedCharIndex),
      isOptional: false,
    };

    line.chords.push(chord);
    line.chords.sort((a, b) => a.startChar - b.startChar);

    showChordInput = false;
    newChordValue = '';
    selectedCharIndex = null;

    onContentChange(buildContent());
  }

  function removeChord(lineIndex: number, chordIndex: number) {
    const section = getCurrentSection();
    if (!section) return;

    const line = section.lines[lineIndex];
    if (!line) return;

    line.chords.splice(chordIndex, 1);
    onContentChange(buildContent());
  }

  function findWordEnd(lyrics: string, start: number): number {
    for (let i = start; i < lyrics.length; i++) {
      if (lyrics[i].trim() === '') {
        return i - 1;
      }
    }
    return lyrics.length - 1;
  }

  function updateLyrics(lineIndex: number, value: string) {
    const section = getCurrentSection();
    if (!section) return;

    const line = section.lines[lineIndex];
    if (!line) return;

    line.lyrics = value;
    onContentChange(buildContent());
  }

  function addLine() {
    const section = getCurrentSection();
    if (!section) return;

    section.lines.push({
      lyrics: '',
      chords: [],
      usePreviousChords: section.repeatChordsFromPrevious,
    });

    onContentChange(buildContent());
  }

  function removeLine(lineIndex: number) {
    const section = getCurrentSection();
    if (!section) return;

    section.lines.splice(lineIndex, 1);
    onContentChange(buildContent());
  }

  function addSection() {
    parsed.sections.push({
      type: 'verse',
      lines: [],
      repeatChordsFromPrevious: false,
    });
    currentSectionIndex = parsed.sections.length - 1;
    onContentChange(buildContent());
  }

  function removeSection(index: number) {
    if (parsed.sections.length <= 1) return;
    parsed.sections.splice(index, 1);
    if (currentSectionIndex >= parsed.sections.length) {
      currentSectionIndex = parsed.sections.length - 1;
    }
    onContentChange(buildContent());
  }

  function toggleRepeatChords() {
    const section = getCurrentSection();
    if (!section) return;

    section.repeatChordsFromPrevious = !section.repeatChordsFromPrevious;
    
    if (section.repeatChordsFromPrevious) {
      const prevSection = currentSectionIndex > 0 ? parsed.sections[currentSectionIndex - 1] : null;
      if (prevSection) {
        for (const line of section.lines) {
          line.usePreviousChords = true;
        }
      }
    } else {
      for (const line of section.lines) {
        line.usePreviousChords = false;
      }
    }

    onContentChange(buildContent());
  }

  function setSectionType(type: SongSection['type']) {
    const section = getCurrentSection();
    if (!section) return;

    section.type = type;
    onContentChange(buildContent());
  }

  function buildContent(): string {
    return buildSng(parsed.metadata, parsed.sections);
  }

  function getWordPositions(lyrics: string): { word: string; start: number; end: number }[] {
    const words: { word: string; start: number; end: number }[] = [];
    let current = '';
    let start = -1;

    for (let i = 0; i < lyrics.length; i++) {
      const char = lyrics[i];
      if (char.trim() === '') {
        if (current) {
          words.push({ word: current, start, end: i - 1 });
          current = '';
          start = -1;
        }
      } else {
        if (start === -1) start = i;
        current += char;
      }
    }

    if (current) {
      words.push({ word: current, start, end: lyrics.length - 1 });
    }

    return words;
  }

  function applyHeuristicFromPrevious() {
    const section = getCurrentSection();
    if (!section || currentSectionIndex === 0) return;

    const prevSection = parsed.sections[currentSectionIndex - 1];
    if (!prevSection || prevSection.lines.length === 0) return;

    for (let lineIdx = 0; lineIdx < section.lines.length; lineIdx++) {
      const line = section.lines[lineIdx];
      const currWords = getWordPositions(line.lyrics);

      if (currWords.length === 0) continue;

      const chords: ChordPlacement[] = [];
      const prevLineIdx = lineIdx < prevSection.lines.length ? lineIdx : prevSection.lines.length - 1;
      const prevChords = prevSection.lines[prevLineIdx]?.chords || [];

      if (prevChords.length > 0) {
        for (let cIdx = 0; cIdx < prevChords.length && cIdx < currWords.length; cIdx++) {
          const prevChord = prevChords[cIdx];
          const currWord = currWords[cIdx];
          
          if (prevChord && currWord) {
            chords.push({
              chord: prevChord.chord,
              startChar: currWord.start,
              endChar: currWord.end,
              isOptional: prevChord.isOptional,
            });
          }
        }
      }

      line.chords = chords;
      line.usePreviousChords = false;
    }

    onContentChange(buildContent());
  }
</script>

<div class="flex flex-col h-full">
  <div class="flex gap-2 mb-4">
    {#each parsed.sections as section, idx}
      <button
        class="px-3 py-1 rounded-md text-sm {idx === currentSectionIndex ? 'bg-indigo-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}"
        onclick={() => currentSectionIndex = idx}
      >
        {section.type === 'custom' ? (section.label || `Section ${idx + 1}`) : section.type} {idx + 1}
        {#if parsed.sections.length > 1}
          <span class="ml-1 text-xs opacity-70 cursor-pointer" onclick={(e) => { e.stopPropagation(); removeSection(idx); }}>×</span>
        {/if}
      </button>
    {/each}
    <button
      class="px-3 py-1 rounded-md text-sm bg-gray-200 hover:bg-gray-300"
      onclick={addSection}
    >
      + Section
    </button>
  </div>

  <div class="flex-1 overflow-auto border rounded-lg p-4">
    {#if getCurrentSection()}
      {@const section = getCurrentSection()}
      <div class="flex items-center gap-4 mb-4 pb-3 border-b">
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium">Type:</label>
          <select
            class="px-2 py-1 border rounded text-sm"
            value={section?.type}
            onchange={(e) => setSectionType(e.currentTarget.value as SongSection['type'])}
          >
            <option value="verse">Verse</option>
            <option value="refrain">Refrain</option>
            <option value="bridge">Bridge</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <label class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={section?.repeatChordsFromPrevious}
            onchange={toggleRepeatChords}
            disabled={currentSectionIndex === 0}
          />
          Same chords as previous
        </label>
        {#if section?.repeatChordsFromPrevious}
          <button
            class="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
            onclick={applyHeuristicFromPrevious}
          >
            Apply Heuristic
          </button>
        {/if}
      </div>

      {#if section?.lines.length === 0}
        <div class="text-center py-8 text-gray-500">
          No lines yet. Click "Add Line" to start.
        </div>
      {/if}

      {#each section?.lines || [] as line, lineIdx}
        <div class="mb-4 p-3 bg-white border rounded-lg">
          {#if line.usePreviousChords}
            <div class="text-sm text-gray-500 mb-2">← Uses chords from previous section</div>
          {/if}

          <div class="flex gap-2 mb-2">
            <button
              class="text-xs text-red-600 hover:text-red-800"
              onclick={() => removeLine(lineIdx)}
            >
              Remove
            </button>
          </div>

          <div class="font-mono text-sm leading-relaxed relative">
            {#if line.chords.length > 0}
              <div class="flex flex-wrap gap-1 mb-1 min-h-[1.5rem]">
                {#each line.chords as chord, chordIdx}
                  <div
                    class="relative group"
                    style="margin-left: {chord.startChar === 0 ? 0 : chord.startChar - (line.chords[chordIdx - 1]?.endChar || 0) - 1}ch"
                  >
                    <span class="text-indigo-600 font-bold text-xs cursor-pointer hover:text-indigo-800">
                      {chord.isOptional ? `(${chord.chord})` : chord.chord}
                    </span>
                    <button
                      class="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100"
                      onclick={() => removeChord(lineIdx, chordIdx)}
                    >
                      ×
                    </button>
                  </div>
                {/each}
              </div>
            {/if}

            <div class="relative">
              {#each getWordPositions(line.lyrics) as word, wordIdx}
                <span
                  class="cursor-pointer hover:bg-indigo-50"
                  onclick={() => addChord(lineIdx, word.start)}
                >
                  {word.word}
                </span>
                {#if wordIdx < getWordPositions(line.lyrics).length - 1}
                  <span>&nbsp;</span>
                {/if}
              {/each}
            </div>
          </div>

          <div class="mt-2">
            <input
              type="text"
              class="w-full px-2 py-1 border rounded text-sm font-mono"
              placeholder="Lyrics..."
              value={line.lyrics}
              oninput={(e) => updateLyrics(lineIdx, e.currentTarget.value)}
            />
          </div>
        </div>
      {/each}

      <button
        class="mt-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
        onclick={addLine}
      >
        + Add Line
      </button>
    {/if}
  </div>

  {#if showChordInput}
    <div class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div class="bg-white p-4 rounded-lg shadow-lg">
        <h3 class="text-sm font-medium mb-2">Add Chord</h3>
        <input
          type="text"
          class="w-full px-3 py-2 border rounded-md mb-3"
          placeholder="e.g., C, Am7, F#m"
          bind:value={newChordValue}
          onkeydown={(e) => e.key === 'Enter' && confirmAddChord(currentSectionIndex)}
        />
        <div class="flex justify-end gap-2">
          <button
            class="px-3 py-1 text-sm bg-gray-200 rounded"
            onclick={() => { showChordInput = false; newChordValue = ''; }}
          >
            Cancel
          </button>
          <button
            class="px-3 py-1 text-sm bg-indigo-600 text-white rounded"
            onclick={() => confirmAddChord(currentSectionIndex)}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
