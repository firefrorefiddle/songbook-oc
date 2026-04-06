import { error } from "@sveltejs/kit";
import {
  formatSongPdfPipelineIssues,
  normalizeMetadataRecord,
  normalizeSongPipelineText,
  validateSongPdfPipelineInput,
} from "$lib/utils/songPdfPipelineSafety";

export function enforceSongPdfPipelineOrThrow(params: {
  title: string;
  author?: string | null;
  content: string;
  metadata?: Record<string, string>;
}): void {
  const issues = validateSongPdfPipelineInput(params);
  if (issues.length > 0) {
    throw error(400, formatSongPdfPipelineIssues(issues));
  }
}

export function normalizedSongVersionWritePayload(params: {
  title: string;
  author?: string | null;
  content: string;
  metadata: Record<string, string>;
}): {
  title: string;
  author: string | null;
  content: string;
  metadata: string;
} {
  return {
    title: params.title.trim(),
    author: params.author?.trim() || null,
    content: normalizeSongPipelineText(params.content),
    metadata: JSON.stringify(normalizeMetadataRecord(params.metadata)),
  };
}

export function parseMetadataRecord(raw: string | null | undefined): Record<string, string> {
  if (!raw?.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "string") {
          out[k] = v;
        }
      }
      return out;
    }
  } catch {
    /* ignore */
  }
  return {};
}
