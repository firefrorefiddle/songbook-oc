export interface SongVersionLike {
  id: string;
  title: string;
  author: string | null;
  content: string;
  metadata: string;
  createdAt: Date | string;
}

export interface SongWithPreferredVersion<TVersion extends SongVersionLike> {
  recommendedVersionId?: string | null;
  recommendedVersion?: TVersion | null;
  versions: TVersion[];
}

export interface SongFieldDifference {
  field: string;
  currentValue: string;
  comparedValue: string;
}

export interface SongContentDiffLine {
  type: "same" | "removed" | "added";
  value: string;
}

export interface SongVersionComparison {
  fieldDifferences: SongFieldDifference[];
  contentDifferences: SongContentDiffLine[];
  hasDifferences: boolean;
}

export function parseSongMetadata(metadata: string): Record<string, string> {
  try {
    const parsed = JSON.parse(metadata) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => typeof value === "string"),
    );
  } catch {
    return {};
  }
}

export function getPreferredSongVersion<TVersion extends SongVersionLike>(
  song: SongWithPreferredVersion<TVersion>,
): TVersion | null {
  if (song.recommendedVersion) {
    return song.recommendedVersion;
  }

  if (song.recommendedVersionId) {
    const matchingVersion = song.versions.find(
      (version) => version.id === song.recommendedVersionId,
    );
    if (matchingVersion) {
      return matchingVersion;
    }
  }

  return song.versions[0] ?? null;
}

export function compareSongVersions(
  currentVersion: SongVersionLike,
  comparedVersion: SongVersionLike,
): SongVersionComparison {
  const fieldDifferences = buildFieldDifferences(
    currentVersion,
    comparedVersion,
  );
  const contentDifferences = diffLines(
    currentVersion.content.split("\n"),
    comparedVersion.content.split("\n"),
  );

  return {
    fieldDifferences,
    contentDifferences,
    hasDifferences:
      fieldDifferences.length > 0 ||
      contentDifferences.some((line) => line.type !== "same"),
  };
}

function buildFieldDifferences(
  currentVersion: SongVersionLike,
  comparedVersion: SongVersionLike,
): SongFieldDifference[] {
  const differences: SongFieldDifference[] = [];

  addDifference(
    differences,
    "Title",
    currentVersion.title,
    comparedVersion.title,
  );
  addDifference(
    differences,
    "Author",
    currentVersion.author ?? "",
    comparedVersion.author ?? "",
  );

  const currentMetadata = parseSongMetadata(currentVersion.metadata);
  const comparedMetadata = parseSongMetadata(comparedVersion.metadata);
  const metadataKeys = new Set([
    ...Object.keys(currentMetadata),
    ...Object.keys(comparedMetadata),
  ]);

  for (const key of Array.from(metadataKeys).sort()) {
    addDifference(
      differences,
      `Metadata: ${key}`,
      currentMetadata[key] ?? "",
      comparedMetadata[key] ?? "",
    );
  }

  return differences;
}

function addDifference(
  differences: SongFieldDifference[],
  field: string,
  currentValue: string,
  comparedValue: string,
): void {
  if (currentValue !== comparedValue) {
    differences.push({
      field,
      currentValue,
      comparedValue,
    });
  }
}

function diffLines(
  currentLines: string[],
  comparedLines: string[],
): SongContentDiffLine[] {
  const lcs = buildLcsMatrix(currentLines, comparedLines);
  const diff: SongContentDiffLine[] = [];

  let currentIndex = currentLines.length;
  let comparedIndex = comparedLines.length;

  while (currentIndex > 0 && comparedIndex > 0) {
    if (currentLines[currentIndex - 1] === comparedLines[comparedIndex - 1]) {
      diff.push({ type: "same", value: currentLines[currentIndex - 1] });
      currentIndex -= 1;
      comparedIndex -= 1;
      continue;
    }

    if (
      lcs[currentIndex - 1][comparedIndex] >=
      lcs[currentIndex][comparedIndex - 1]
    ) {
      diff.push({ type: "removed", value: currentLines[currentIndex - 1] });
      currentIndex -= 1;
      continue;
    }

    diff.push({ type: "added", value: comparedLines[comparedIndex - 1] });
    comparedIndex -= 1;
  }

  while (currentIndex > 0) {
    diff.push({ type: "removed", value: currentLines[currentIndex - 1] });
    currentIndex -= 1;
  }

  while (comparedIndex > 0) {
    diff.push({ type: "added", value: comparedLines[comparedIndex - 1] });
    comparedIndex -= 1;
  }

  return diff.reverse();
}

function buildLcsMatrix(
  currentLines: string[],
  comparedLines: string[],
): number[][] {
  const matrix = Array.from({ length: currentLines.length + 1 }, () =>
    Array.from({ length: comparedLines.length + 1 }, () => 0),
  );

  for (
    let currentIndex = 1;
    currentIndex <= currentLines.length;
    currentIndex += 1
  ) {
    for (
      let comparedIndex = 1;
      comparedIndex <= comparedLines.length;
      comparedIndex += 1
    ) {
      if (currentLines[currentIndex - 1] === comparedLines[comparedIndex - 1]) {
        matrix[currentIndex][comparedIndex] =
          matrix[currentIndex - 1][comparedIndex - 1] + 1;
      } else {
        matrix[currentIndex][comparedIndex] = Math.max(
          matrix[currentIndex - 1][comparedIndex],
          matrix[currentIndex][comparedIndex - 1],
        );
      }
    }
  }

  return matrix;
}
