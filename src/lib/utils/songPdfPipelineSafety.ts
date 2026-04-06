import {
  validateReplayCarets,
  type ReplayCaretIssue,
} from "$lib/utils/replayCaretValidation";

export type SongPdfPipelineMetadata = Partial<{
  copyright: string;
  reference: string;
  extraIndex: string;
  translationBy: string;
  musicBy: string;
  lyricsBy: string;
  numbering: string;
}>;

export type PdfPipelineIssueCode =
  | "nul_byte"
  | "header_multiline"
  | "header_control_character"
  | "raw_sng_missing_separator"
  | ReplayCaretIssue["kind"];

export interface PdfPipelineIssue {
  code: PdfPipelineIssueCode;
  message: string;
  lineNumber?: number;
  field?: string;
}

function containsNul(s: string): boolean {
  return s.includes("\0");
}

/**
 * Strips NUL and C0 control characters except TAB and LF so song text stays
 * valid UTF-8 text for the toolchain without surprising pdflatex/songmaker.
 */
export function stripNulAndDisallowedControls(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c === 0) {
      continue;
    }
    if (c < 32 && c !== 9 && c !== 10) {
      continue;
    }
    out += ch;
  }
  return out;
}

export function normalizeSongPipelineLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function normalizeSongPipelineText(text: string): string {
  return stripNulAndDisallowedControls(normalizeSongPipelineLineEndings(text));
}

/**
 * Escapes characters that songmaker copies into LaTeX `\\beginsong{...}` (and
 * similar) so common punctuation survives pdflatex.
 */
export function escapeStructuredHeaderFieldForSng(value: string): string {
  let result = "";
  for (const ch of value) {
    switch (ch) {
      case "\\":
        result += "\\textbackslash{}";
        break;
      case "{":
        result += "\\{";
        break;
      case "}":
        result += "\\}";
        break;
      case "#":
        result += "\\#";
        break;
      case "$":
        result += "\\$";
        break;
      case "%":
        result += "\\%";
        break;
      case "^":
        result += "\\^{}";
        break;
      case "_":
        result += "\\_";
        break;
      case "&":
        result += "\\&";
        break;
      case "~":
        result += "\\~{}";
        break;
      default:
        result += ch;
    }
  }
  return result;
}

function validateScalarHeaderField(
  value: string,
  fieldLabel: string,
): PdfPipelineIssue[] {
  const issues: PdfPipelineIssue[] = [];
  if (containsNul(value)) {
    issues.push({
      code: "nul_byte",
      field: fieldLabel,
      message: `${fieldLabel} must not contain NUL bytes.`,
    });
  }
  if (value.includes("\n") || value.includes("\r")) {
    issues.push({
      code: "header_multiline",
      field: fieldLabel,
      message: `${fieldLabel} cannot contain line breaks (song file headers are single-line).`,
    });
  }
  for (const ch of value) {
    const c = ch.codePointAt(0)!;
    if (c < 32 && c !== 9) {
      issues.push({
        code: "header_control_character",
        field: fieldLabel,
        message: `${fieldLabel} contains a disallowed control character.`,
      });
      break;
    }
  }
  return issues;
}

function replayIssues(contentForReplay: string): PdfPipelineIssue[] {
  const out: PdfPipelineIssue[] = [];
  for (const r of validateReplayCarets(contentForReplay)) {
    out.push({
      code: r.kind,
      lineNumber: r.lineNumber,
      message:
        r.kind === "replay_no_chords"
          ? `Line ${r.lineNumber}: ${r.caretCount} replay marker(s) (^) but no chord line memorizes chords yet.`
          : `Line ${r.lineNumber}: ${r.caretCount} replay marker(s) (^), but only ${r.memorizedChordSlots} chord slot(s) are memorized (from the last chord line).`,
    });
  }
  return out;
}

function rawSngBodyAndSeparatorIndex(
  normalizedContent: string,
): { sepIndex: number; body: string } | null {
  const lines = normalizedContent.split("\n");
  const sepIndex = lines.findIndex((l) => l.trim() === "***");
  if (sepIndex === -1) {
    return null;
  }
  return {
    sepIndex,
    body: lines.slice(sepIndex + 1).join("\n"),
  };
}

export function isRawSngContent(content: string): boolean {
  return normalizeSongPipelineText(content).trimStart().startsWith("title:");
}

/**
 * Validates title, author, metadata, and chord body for PDF/songmaker safety.
 * Structured songs get header fields escaped at build time; raw .sng content is
 * validated conservatively (separator, replay markers) but not rewritten.
 */
export function validateSongPdfPipelineInput(params: {
  title: string;
  author?: string | null;
  content: string;
  metadata?: Record<string, string>;
}): PdfPipelineIssue[] {
  const issues: PdfPipelineIssue[] = [];
  const normalizedContent = normalizeSongPipelineText(params.content);

  const title = params.title;
  issues.push(...validateScalarHeaderField(title, "Title"));
  if (params.author != null && params.author !== "") {
    issues.push(...validateScalarHeaderField(params.author, "Author"));
  }

  const meta = params.metadata ?? {};
  for (const [key, value] of Object.entries(meta)) {
    if (!value) {
      continue;
    }
    issues.push(
      ...validateScalarHeaderField(value, `Metadata (“${key}”)`),
    );
  }

  if (isRawSngContent(normalizedContent)) {
    const parsed = rawSngBodyAndSeparatorIndex(normalizedContent);
    if (!parsed) {
      issues.push({
        code: "raw_sng_missing_separator",
        message:
          'Raw song text must include a line with only "***" separating the header from the lyrics.',
      });
    } else {
      issues.push(...replayIssues(parsed.body));
    }
  } else {
    issues.push(...replayIssues(normalizedContent));
  }

  return issues;
}

export function formatSongPdfPipelineIssues(issues: PdfPipelineIssue[]): string {
  if (issues.length === 0) {
    return "";
  }
  return issues.map((i) => i.message).join("\n");
}

export function normalizeMetadataRecord(
  metadata: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(metadata)) {
    out[k] = normalizeSongPipelineText(v);
  }
  return out;
}

/**
 * Builds .sng source for songmaker: escapes structured headers; passes raw .sng
 * through (after normalizing line endings and stripping dangerous controls).
 */
export function buildSongContentForPdf(
  title: string,
  content: string,
  author?: string | null,
  metadata?: SongPdfPipelineMetadata,
): string {
  const normalizedContent = normalizeSongPipelineText(content);
  if (normalizedContent.trimStart().startsWith("title:")) {
    return normalizedContent;
  }

  let sngContent = `title: ${escapeStructuredHeaderFieldForSng(title)}\n`;
  if (author?.trim()) {
    sngContent += `author: ${escapeStructuredHeaderFieldForSng(author.trim())}\n`;
  }
  if (metadata?.lyricsBy?.trim()) {
    sngContent += `lyricsBy: ${escapeStructuredHeaderFieldForSng(metadata.lyricsBy.trim())}\n`;
  }
  if (metadata?.musicBy?.trim()) {
    sngContent += `musicBy: ${escapeStructuredHeaderFieldForSng(metadata.musicBy.trim())}\n`;
  }
  if (metadata?.translationBy?.trim()) {
    sngContent += `translationBy: ${escapeStructuredHeaderFieldForSng(metadata.translationBy.trim())}\n`;
  }
  if (metadata?.copyright?.trim()) {
    sngContent += `copyright: ${escapeStructuredHeaderFieldForSng(metadata.copyright.trim())}\n`;
  }
  if (metadata?.reference?.trim()) {
    sngContent += `reference: ${escapeStructuredHeaderFieldForSng(metadata.reference.trim())}\n`;
  } else {
    sngContent += "reference:\n";
  }
  if (metadata?.extraIndex?.trim()) {
    sngContent += `extra-index: ${escapeStructuredHeaderFieldForSng(metadata.extraIndex.trim())}\n`;
  }
  if (metadata?.numbering?.trim()) {
    sngContent += `numbering: ${escapeStructuredHeaderFieldForSng(metadata.numbering.trim())}\n`;
  }
  sngContent += "***\n";
  sngContent += normalizedContent;
  return sngContent;
}
