# Songbook PDF generation — architecture & findings

This document captures how Songbook-OC turns songs into PDFs, the two LaTeX
"styles", how the `songmaker` Haskell CLI fits in, and the practical gotchas for
iterating on the pipeline. It reflects the state of the code as explored/changed
on 2026-06-03 (the work that aligned the `songbook_tex` output with the legacy
Liedermappe `target.pdf`).

## 1. High-level flow

```
SongbookVersion (DB)
  └─ songs[] (ordered)  ── for each song ──┐
                                           ▼
   SongVersion {title, author, content, metadata}
                                           │  buildSongContentForPdf(...)
                                           ▼
                                  .sng text (header + *** + chordpro body)
                                           │  songmaker-cli  (per song)
                                           ▼
                                  per-song .tex fragment
                                           │  concatenate
                                           ▼
                              generated-songs.tex  +  table-of-contents.tex
                                           │  pdflatex × 2
                                           ▼
                                        main.pdf
```

Key source files:

- `src/lib/server/songbookPdf.ts` — orchestrator. Resolves songbook/version,
  builds each `.sng`, runs songmaker, assembles `generated-songs.tex` and
  `table-of-contents.tex`, copies the right LaTeX templates into a temp dir, and
  runs `pdflatex` twice. Also `exportSongbookLatexWorkspace` (dump the exact
  LaTeX tree without running pdflatex) and `generateSongbookPdf` (full build).
- `src/lib/utils/songPdfPipelineSafety.ts` — `buildSongContentForPdf` plus all
  the input-safety logic (LaTeX escaping of header fields, chordpro `$`/`_`
  escaping, control-char stripping, replay-caret validation).
- `src/lib/server/latexLayout.ts` — `OutputSettings` parsing and
  `@@PAPERSIZE@@`/`@@FONTSIZE@@` placeholder substitution in `layout.tex`.
- `src/lib/songLatexStyle.ts` — the `SongLatexStyle` union and the
  `--songssty` flag decision.
- `bin/songmaker-cli` — compiled Haskell binary (source in `songmaker/`).
- `src/lib/server/latex/*` — the LaTeX templates (see §4).

`OutputSettings` (stored per songbook in `Songbook.outputSettings` JSON):

- `mode`: `chorded` | `text-only` | `overhead`
- `fontSize`: `small`(14) | `medium`(16) | `large`(20) | `extra-large`(24) pt
- `paperSize`: `a4` | `a5` | `letter`
- `latexStyle`: `songs_sty` | `songbook_tex` (see §2)

`overhead` mode always forces `songs_sty` (`effectiveLatexStyle`).

## 2. The two LaTeX "styles"

There are **two independent rendering backends**, selected by `latexStyle`:

### `songs_sty` (the "old" method) — default

- Uses the classic CTAN **`songs` package** (`src/lib/server/latex/songs.sty`).
- songmaker is invoked **with `--songssty`** and emits `\beginsong{Title}[by=…,cr=…,sr=…]`
  with inline `\[C]` chords — the songs-package format.
- Templates: `chorded.tex` / `text-only.tex` / `overhead.tex` (+ `layout.tex`,
  `font-body.tex`, `songbook-hyper-toc.tex`, `songs.sty`).
- The songs package natively supports a sorted, grouped title index
  (`\newindex` + `\showindex`), but **the pipeline does not use it** — it replaces
  it with a custom `\songtocline` ToC (see §5) to avoid the external `songidx`
  sort step.

### `songbook_tex` (the "new" method)

- Uses a **project-owned** package `songbook-layout.sty` (no `songs` package).
- songmaker is invoked **without a flag** and emits project macros:
  `\BeginSong{N}{Title}{Reference}{T/M: …}{Copyright}`, `\BeginVerse{n}…\EndVerse`,
  `\BeginSection{label}…\EndSection`, `\SongLine{…}`, `\Ch{chord}{lyric}`
  (chord stacked over a lyric fragment via a `tabular`), `\ChordOnly{chord}`,
  `\LRep`/`\RRep` (repeat bars), `\SongTextNote`/`\SongMusicNote`, `intersong`.
- Templates: `chorded-songbook.tex` / `text-only-songbook.tex` (+ `layout.tex`,
  `songbook-style.tex`, `font-body-songbook.tex`, `songbook-toc-native.tex`,
  `songbook-layout.sty`).
- Index is generated in TypeScript and rendered by `songbook-toc-native.tex`
  (see §5).

`MODE_TEMPLATE_MAP` and `setupLatexFiles` in `songbookPdf.ts` decide which
template set is copied into the build dir.

> Naming caveat: the file `songs.sty` belongs to the **old** method; the file
> `songbook-layout.sty` belongs to the **new** method. The names are easy to mix up.

## 3. The `.sng` format and `songmaker`

`.sng` = header lines, a `***` separator, then chordpro-style body.

```
title: All heav'n declares
number: 8
author: Noel und Tricia Richards
reference: Psalm 19,2; 40,6
copyright: Thankyou Music / kingswaysongs.com
***
A           D  E              D  A
All heav'n declares the glory of the risen Lord.
```

Recognized headers: `title` (required), `number`, `original`, `author`,
`lyricsBy`, `musicBy`, `translationBy`, `key`, `copyright`, `reference`,
`license`, `numbering`, `extra-index`, `extra-title-index`.

`buildSongContentForPdf` builds this header from the DB fields and **escapes**
structured fields for LaTeX. If `SongVersion.content` already starts with
`title:` it is treated as **raw `.sng`** and passed through (only newline
normalization + control stripping + a `number:` injection).

### songmaker internals (`songmaker/src/SongMaker/…`)

Pipeline: `parseSongParsed` → `normalizeSong` → `buildLayout` → backend render.

- `Parse/ParsedSong.hs` — header/body parser → `AST/Parsed` (`SongMetaParsed`,
  `BlockParsed`). Sections labeled `Ref.`/`Chorus`/`Bridge` (and German variants)
  are classified here.
- `Normalize/Semantic.hs` — `AST/Parsed` → `AST/Semantic`. Resolves chord
  anchors (chord-over-lyric column offsets), `^` caret replay against a previous
  same-shaped section, and extracts `|:`/`:|` repeat markers.
- `Layout/Build.hs` — `AST/Semantic` → `AST/Layout` (`LayoutMeta`, blocks).
  `lmSongNumber` comes from the `number` header (`sSongNumber`), default `"1"`.
- `Render/TeX/LayoutBackend.hs` — `SongLayout` → project-owned TeX (`\BeginSong`…).
- `Render/TeX/SongsStyBackend.hs` — `SongLayout` → `songs`-package TeX.

Both backends share the same parse/normalize/layout front-end; only the final
render differs. The `number` header therefore feeds both, but only the
LayoutBackend's `\BeginSong{N}` consumes it (the songs package auto-numbers).

CLI (`songmaker/cli/Main.hs` → `IO.hs`):

- `songmaker-cli file.sng` → writes `file.tex` (project-owned backend).
- `songmaker-cli --songssty file.sng` → songs-package backend.
- `songmaker-cli -j file.sng` → JSON.
- With no filename it reads stdin / writes stdout.

> The JSON/Aeson path (`Format/Aeson`, `Convert/Aeson`) uses a separate legacy
> `Read.hs`/`Song` type and does **not** touch `SongMetaParsed`/`SongMetaSemantic`,
> so adding fields to those records is safe for the layout path.

### Building songmaker

`scripts/build-songmaker.sh` runs `cabal build songmaker-cli`, resolves the
output with `cabal list-bin`, and copies it to `bin/songmaker-cli` (the path the
pipeline invokes). Toolchain present: GHC 8.8.4, cabal 3.10.

## 4. LaTeX templates (`src/lib/server/latex/`)

| File | Style | Role |
| --- | --- | --- |
| `layout.tex` | both | `scrbook` class, paper/font placeholders, `\pagestyle{empty}` |
| `songs.sty` | old | CTAN songs package (chorded songbook formatting + native index) |
| `font-body.tex` | old | DejaVuSans chords + mathpazo body; `\printchord` |
| `chorded.tex` / `text-only.tex` / `overhead.tex` | old | document drivers |
| `songbook-hyper-toc.tex` | old | custom `\songtocline` ToC + hyperref |
| `songbook-layout.sty` | new | project song macros (`\BeginSong`, `\Ch`, repeats, notes) |
| `songbook-style.tex` | new | loads `songbook-layout` |
| `font-body-songbook.tex` | new | DejaVuSans + mathpazo (no `\printchord`) |
| `chorded-songbook.tex` / `text-only-songbook.tex` | new | document drivers |
| `songbook-toc-native.tex` | new | two-column grouped index (see §5) |
| `preview-song*.tex`, `preview-font*.tex` | preview | single-song PNG preview (extarticle) |

LaTeX deps (need `texlive-full`): `songs`, `scrbook`, `DejaVuSans`, `mathpazo`,
`pdfpages`, `babel`/`ngerman`, plus `multicol`, `xcolor`, `needspace`,
`etoolbox`, `xparse`, `hyperref` for the new method.

## 5. The index / table of contents

Both styles emit a `table-of-contents.tex` produced by
`generateTableOfContents(songs, style)` in `songbookPdf.ts`, which dispatches:

- `songs_sty` → `buildSongbookTocLatex`: flat, **song-order** list of
  `\songtocline{anchor}{title}{n}` (single column, dot leaders). Anchors target
  the songs-package `\songtarget` (`#1.1`).
- `songbook_tex` → `buildNativeSongbookIndex`: **alphabetically sorted, grouped**
  index matching the Liedermappe:
  - sort titles with a German `Intl.Collator` (case-insensitive);
  - group by `songbookIndexLetter(title)` — first letter upper-cased, German
    diacritics folded to base letter (Ä→A, Ö→O, Ü→U, ß→S), non-letters → `#`;
  - emit `\songtocletter{X}` (gray letter box) then
    `\songtocline{n}{title}{n}` where `n` is the song's **gray-box number**
    (= songbook position, 1-based — so the index number matches the box).

`songbook-toc-native.tex` renders it with `multicols{2}`, gray letter boxes
(reusing `SongNumberBg` from `songbook-layout.sty`), italic slanted titles,
dot leaders, and **flush-right numbers with ragged wrapped titles** via the
tocloft trick: `\rightskip` reserves the right margin and `\parfillskip=-\rightskip`
cancels it on the last line. `\BeginSong` emits `\hypertarget{song-N}` so index
entries hyperlink to the song.

> The original Liedermappe inverts leading articles ("The Nazarene" → "Nazarene,
> The") via explicit songs-package index keys. Our songs lack that metadata, so
> plain title collation is used; "Der …" titles correctly stay under **D**.

## 6. Song numbering

`lmSongNumber` was historically hard-coded to `"1"`, so every gray box showed 1.
Numbering is a **songbook-level** concern, so the pipeline owns it: the loop index
(`i + 1`) is passed to `buildSongContentForPdf` / `convertSongToLatex`, which
writes `number: N` into the `.sng`. songmaker renders it into `\BeginSong{N}`.

## 7. Iterating efficiently

- **Fast loop**: export the LaTeX workspace once, then edit only the templates
  and re-run `pdflatex` in the export dir (~4–5 s for ~170 pages) — no songmaker
  re-run. Re-export only when songmaker output or `.sng`/numbering logic changes.
- **Exporting a workspace**: `exportSongbookLatexWorkspace(songbookId, outDir)`
  writes the full tree (per-song `.sng`/`.tex`, `generated-songs.tex`,
  `table-of-contents.tex`, templates, `EXPORT_MANIFEST.txt`).
- **Rendering for review**: `pdftoppm -png -r 80 -f <from> -l <to> main.pdf out/p`.
- **Cross-host compare**: `scripts/compare-songbook-pdflatex-cross-host.sh` (same
  LaTeX bytes → any PDF diff is the TeX engine/fonts).

## 8. Gotchas / known issues

- **`$lib` under `tsx`**: scripts that import server modules (e.g.
  `scripts/export-songbook-latex.ts`, `build-all-songbook-pdfs.ts`) fail with
  `Cannot find package '$lib'` because `tsx` doesn't resolve SvelteKit's alias.
  Run such code through **vitest** (which has the SvelteKit plugin) instead, or
  resolve the alias explicitly. Same root cause makes `svelte-check` report many
  `Cannot find module '$lib/...'` errors (pre-existing).
- **Test suite env breakage (pre-existing)**: the default `jsdom` vitest
  environment currently fails to load (`@exodus/bytes` ESM required by
  `html-encoding-sniffer`), so `pnpm test`/`pnpm test:run` error before running.
  Node-only tests work with `vitest run --environment node` or a
  `// @vitest-environment node` directive at the top of the file.
- **`pdflatex` runs twice**: required so the index/hyperref anchors resolve.
- **hyperref dest suffix (old method)**: songs-package `\songtarget` lives inside
  a deferred `\vbox`, so links must target `#1.1`, not `#1` (see
  `songbook-hyper-toc.tex`). The new method uses its own `\hypertarget{song-N}`.
- **Chord stacking (new method)**: `\Ch{chord}{lyric}` sizes each column to
  `max(chord, lyric)` width, so wide chords stretch dense lyric lines (e.g.
  hyphenated syllables look spaced out). The songs package overhangs chords
  instead. Acceptable per current requirements but a candidate for refinement.
- **SQLite path**: Prisma resolves `file:./dev.db` relative to `prisma/`, so the
  dev DB is usually `prisma/dev.db`. Never `db:push` (it wipes data) — use
  migrations.

## 9. Reference: matching `target.pdf`

`target.pdf` is the legacy "Jugend" Liedermappe (176 pp., MiKTeX, songs package).
The DB "Jugend" songbook (97 songs) is its analog. To reproduce the look with the
new method, set that songbook's `latexStyle` to `songbook_tex` and build. The
resulting index is visually equivalent (heading, gray letter boxes, italic
titles, dot leaders, right-aligned numbers, two-column, ragged wrapping); per-song
pages carry the gray number box, reference, `T/M:`, verse numbers, repeats, and
copyright footer. Song numbers differ only because our books number sequentially
(1–97) while the original carried legacy numbers.
