/**
 * Single whitespace-separated token on a chord line.
 *
 * Extends the English-centric pattern with German symbols: `H` (B natural) is
 * outside ASCII `[A-G]`, and roots like `fis` / `cis` start with lowercase letters,
 * so they never matched `[\dA-G]` and whole chord rows were misclassified as lyrics.
 *
 * Must stay aligned with `isChordLineType` in `sngParser.ts` and `CHORD_WORD_RE` in
 * `replayCaretValidation.ts` (both import this).
 */
export const CHORD_WORD_RE =
  /^(\^|[\dA-H](?:#|b|is|es|ims)?(|m|maj|min|dim|aug|sus[24]?|add[0-9]+|[0-9]+)?(\/[A-H][#b]?)?|(?:fis|gis|cis|dis|ais|his|des|ges|bes|es|as|h|e|a|d|g|f|c|b)(?:7|m|maj|min|dim|°|sus[24]?|add[0-9]+|[0-9]+)?(\/[A-H][#b]?)?|\([^)]+\)|\[[^\]]+\]|\|[|:])$/;
