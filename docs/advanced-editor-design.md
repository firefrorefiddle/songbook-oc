# Advanced Song Editor Design

## Overview

This document describes the design for an advanced graphical song editor that allows users to place chords over lyrics without needing to manually align chord lines. The editor coexists with the existing text-based editor, and users can choose which editor to use.

## The .sng Format

### File Structure

```
title: Song Title
copyright: © 2024 ...
author: Artist Name
reference: Psalm 23
numbering: unnumbered
***
<chord line 1>
<lyrics line 1>
<chord line 2>
<lyrics line 2>
...
```

- **Header**: Key-value pairs before `***` separator
- **Body**: Alternating chord lines and lyrics lines after `***`
- **Verse separation**: Empty line between verses

### Header Fields

| Field            | Required | Description                    |
| ---------------- | -------- | ------------------------------ |
| `title:`         | Yes      | Song title                     |
| `copyright:`     | No       | Copyright information          |
| `author:`        | No       | Author/composer                |
| `lyricsBy:`      | No       | Lyricist                       |
| `musicBy:`       | No       | Composer                       |
| `translationBy:` | No       | Translator                     |
| `original:`      | No       | Original title (if translated) |
| `reference:`     | No       | Biblical reference             |
| `numbering:`     | No       | Usually `unnumbered`           |
| `extra-index:`   | No       | Custom sort index              |
| `\musicnote{}`   | No       | LaTeX music note               |
| `\textnote{}`    | No       | LaTeX text note                |

### Chord Syntax

#### 1. Explicit Chords (Standard)

The chord line is space-aligned above the lyrics line. Chords are placed directly over the word they accompany:

```
C          F             C            d G
Halleluja, lobet Gott in seinem Heiligt-um,
```

This produces: `\ch[C]{Halleluja} \ch[F]{lobet} \ch[C]{Gott} in \ch[d]{seinem} \ch[G]{Heiligt-um}`

#### 2. Chord Repeat (`^` Symbol)

The `^` symbol means "use the chord from the previous verse at this position":

```
C          F             C
Halleluja, lobet Gott,

^Lobet ^ihn mit ^den Posaunen,
```

Line 2 uses chords C, F, C from line 1 at the positions of "Lobet", "ihn", and "mit".

#### 3. Chord Repeat at End of Line

Trailing `^` can indicate the chord continues after the last word:

```
vor dir ^stehn,^
```

#### 4. Parentheses for Optional Chords

```
A (e)           (A)             D
|: dann wächst der Tempel mehr und mehr. :|
```

Parentheses indicate alternative or optional chords.

#### 5. Escaped Characters

Some characters are escaped for LaTeX:

- `\[C D]` - Literal brackets in output
- `''` - Escaped quotes

### Special Notation

#### Repeat Markers

```
|: text :|
```

#### Hyphens for Melismas/Syllables

- Single `-`: Syllable joiner (`Go-tes` = 2 syllables)
- Double `--`: Longer melisma/pause (`Ma----ßen`)

#### Section Labels

- `Ref.:` - Chorus/Refrain
- `Bridge:` - Bridge section
- `Verse:` - Verse (rare)
- Custom labels are possible

#### Empty Chord Lines

Some verses have no chord line above the lyrics, creating an unaccompanied vocal line.

---

## Editor Architecture

### Editor Selection

On the song edit page, show both options:

- **Text Editor**: Current chordpro-style editing
- **Graphical Editor**: New advanced editor

Remember user preference in localStorage.

### Data Model

```typescript
interface SongData {
  title: string;
  copyright?: string;
  author?: string;
  lyricsBy?: string;
  musicBy?: string;
  reference?: string;
  sections: SongSection[];
}

interface SongSection {
  type: "verse" | "refrain" | "bridge" | "custom";
  label?: string;
  lines: ChordedLine[];
  repeatChordsFromPrevious: boolean; // NEW: checkbox for entire section
}

interface ChordedLine {
  lyrics: string; // Raw lyrics text
  chords: ChordPlacement[]; // Explicit chord placements
  usePreviousChords: boolean; // True if this line uses ^ syntax
}

interface ChordPlacement {
  chord: string; // e.g., "C", "F#", "Am7"
  startChar: number; // Character position in lyrics
  endChar: number; // Character position
}
```

### Conversion Flow

```
.sng file <-> Parser <-> Internal Model <-> Converter <-> .sng file
                                    |
                              Graphical Editor
```

The parser converts .sng to the internal model. The graphical editor works with the model and converts back to .sng on save.

---

## Graphical Editor UI Design

### Main Layout

```
┌─────────────────────────────────────────────────────────┐
│ [Title: _______________]  [Ref: ____]                   │
├─────────────────────────────────────────────────────────┤
│  Song Editor (Advanced)                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Section: [Verse 1 ▼] [x] Same chords as prev   │   │
│  │ ┌─────────────────────────────────────────┐     │   │
│  │ │ Lyrics input area with inline chords   │     │   │
│  │ │                                         │     │   │
│  │ │  C      F        C    G                │     │   │
│  │ │ Halleluja, lobet Gott in seinem         │     │   │
│  │ │               ^        ^                 │     │   │
│  │ │ (chord buttons appear on click)         │     │   │
│  │ └─────────────────────────────────────────┘     │   │
│  │                                                 │   │
│  │ [+ Add Line]  [+ Add Section]                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│ [Save] [Cancel] [Switch to Text Editor]                │
└─────────────────────────────────────────────────────────┘
```

### Section/verse Checkbox

At the top of each verse section:

- **Checkbox**: "Same chords as previous verse"
- When checked:
  - All lines in this section use `^` syntax
  - Chords are automatically inherited from the previous verse's positions
  - The heuristic auto-places them based on syllable matching
  - User can override by manually adding chords (converts to explicit)

### Chord Input

1. Click on a syllable/word to select it
2. A chord input field appears (or chord picker)
3. Type chord name (e.g., "C", "Am7", "F#m") and press Enter
4. Chord appears above the selected position

### Drag to Adjust

- Drag a chord horizontally to move it to a different position
- Snap to syllable boundaries for easier placement

### Auto-Apply Heuristic

When "Same chords as previous" is checked:

1. **Syllable Analysis**: Split previous verse lyrics into syllables
2. **Word Matching**: Match current verse words to previous verse words
3. **Position Mapping**: Place `^` at positions corresponding to previous chord positions
4. **Display**: Show the suggested placements; user can adjust by dragging

**Algorithm**:

```
For each word in current verse:
  1. Find corresponding word in previous verse (fuzzy match on similarity)
  2. If found, copy chord position relative to that word
  3. If not found, use syllable count heuristic (distribute chords evenly)
```

### Chord Palette (Optional)

Quick-access buttons for common chords in the song's key, plus recently used chords.

---

## Feature Support Matrix

| Feature                      | Text Editor | Graphical Editor  |
| ---------------------------- | ----------- | ----------------- |
| Basic chord placement        | ✓           | ✓                 |
| ^ repeat syntax              | Manual      | Auto + checkbox   |
| Section labels (Ref.:, etc.) | Manual      | Dropdown selector |
| Repeat markers (\|: :\|)     | Manual      | Visual toggle     |
| Parenthesized chords         | Manual      | Visual toggle     |
| Escaped characters           | Manual      | Preserved         |
| Music/text notes             | Manual      | Read-only display |
| Empty chord lines            | ✓           | ✓ (unaccompanied) |
| Multi-chord per word         | Manual      | Multiple clicks   |
| Drag to reposition           | ✗           | ✓                 |

---

## Implementation Priorities

### Phase 1: Core Functionality

- [ ] Parse .sng to internal model
- [ ] Display lyrics with editable chord placements
- [ ] Add/remove/edit chords via click
- [ ] Save back to .sng format
- [ ] "Same chords as previous" checkbox with auto-apply heuristic

### Phase 2: Enhanced UX

- [ ] Drag to reposition chords
- [ ] Section label dropdown
- [ ] Chord palette for quick access
- [ ] Undo/redo support

### Phase 3: Full Feature Parity

- [ ] Visual repeat markers
- [ ] Parenthesized chord toggle
- [ ] Music notes display
- [ ] Handle edge cases

---

## Edge Cases to Handle

1. **Empty verses**: Lines with no chords above them
2. **First verse with ^**: Error - no previous verse to reference
3. **Verse with different word count**: Heuristic must handle gracefully
4. **Special characters in lyrics**: Preserve `-`, `--`, quotes
5. **Non-ASCII characters**: German umlauts, accented characters
6. **Very long lines**: Horizontal scroll or wrap
7. **Songs with no chords**: Display as plain text
8. **Mixed explicit and ^ chords**: Allow both in same verse

---

## Testing Approach

1. **Parsing tests**: Verify .sng files parse correctly to model
2. **Round-trip tests**: Parse -> convert -> parse produces identical output
3. **Heuristic tests**: Verify auto-placement matches expected positions
4. **Edge case tests**: Empty verses, different word counts, special chars
5. **User testing**: Verify intuitive chord placement workflow
