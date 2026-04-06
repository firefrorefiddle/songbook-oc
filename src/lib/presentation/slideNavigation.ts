/**
 * Presentation slide indices are 0-based and clamped to available slides.
 */

export function parseInitialSlideIndex(
  raw: string | null | undefined,
  slideCount: number,
): number {
  if (slideCount <= 0) {
    return 0;
  }
  const trimmed = raw?.trim();
  if (!trimmed) {
    return 0;
  }
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.max(0, Math.min(slideCount - 1, n));
}

export function navigateRelative(
  current: number,
  delta: number,
  slideCount: number,
): number {
  if (slideCount <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(slideCount - 1, current + delta));
}
