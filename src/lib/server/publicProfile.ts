/** Max length for optional community-facing profile text (stored on User.publicBio). */
export const PUBLIC_BIO_MAX_LENGTH = 400;

export type ParsePublicBioResult =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

/**
 * Normalizes and validates raw profile bio input from forms.
 * Empty or whitespace-only input clears the field (null).
 */
export function parsePublicBioInput(raw: unknown): ParsePublicBioResult {
  if (raw === null || raw === undefined) {
    return { ok: true, value: null };
  }
  if (typeof raw !== "string") {
    return { ok: false, error: "Public bio must be text." };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: true, value: null };
  }
  if (trimmed.length > PUBLIC_BIO_MAX_LENGTH) {
    return {
      ok: false,
      error: `Public bio must be at most ${PUBLIC_BIO_MAX_LENGTH} characters.`,
    };
  }
  return { ok: true, value: trimmed };
}
