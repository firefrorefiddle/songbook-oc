interface SongTaxonomyInput {
  filename: string;
  title: string;
  content: string;
  metadata?: Record<string, string | undefined>;
  collectionCategories?: string[];
}

interface SongTaxonomy {
  categories: string[];
  tags: string[];
}

interface CollectionCategoryRule {
  sourceFile: string;
  category: string;
}

const COLLECTION_CATEGORY_RULES: CollectionCategoryRule[] = [
  { sourceFile: "gemeinde_songs.tex", category: "Community" },
  { sourceFile: "jugend_songs.tex", category: "Youth" },
  { sourceFile: "lager_songs.tex", category: "Camp" },
  { sourceFile: "loben_songs.tex", category: "Praise" },
  { sourceFile: "lungau_songs.tex", category: "Lungau" },
  { sourceFile: "eigene_mappe_songs.tex", category: "Personal Collection" },
];

const LANGUAGE_STOP_WORDS = {
  German: [
    "der",
    "die",
    "das",
    "und",
    "herr",
    "ich",
    "du",
    "dein",
    "deine",
    "ist",
    "wir",
    "mich",
    "nicht",
  ],
  English: [
    "the",
    "and",
    "lord",
    "you",
    "your",
    "my",
    "is",
    "me",
    "we",
    "our",
    "with",
    "of",
  ],
} as const;

const KEYWORD_TAG_RULES = [
  {
    tag: "Christmas",
    patterns: [
      "christmas",
      "weihnacht",
      "krippe",
      "bethlehem",
      "manger",
      "advent",
    ],
  },
  {
    tag: "Easter",
    patterns: ["easter", "oster", "aufersteh", "resurrection", "risen"],
  },
  {
    tag: "Communion",
    patterns: [
      "communion",
      "abendmahl",
      "brot",
      "kelch",
      "cup",
      "wine",
      "bread",
    ],
  },
  {
    tag: "Opening",
    patterns: [
      "opening",
      "beginn",
      "come let us",
      "kommt lasst uns",
      "welcome",
    ],
  },
];

function countWordMatches(text: string, words: readonly string[]): number {
  return words.reduce((count, word) => {
    const matches = text.match(new RegExp(`\\b${escapeRegExp(word)}\\b`, "g"));
    return count + (matches?.length ?? 0);
  }, 0);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normaliseName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normaliseSongFilename(filename: string): string {
  return filename
    .replace(/\.sng$/i, "")
    .trim()
    .toLowerCase();
}

export function buildCollectionCategoryIndex(
  files: Record<string, string>,
): Map<string, string[]> {
  const index = new Map<string, Set<string>>();

  for (const rule of COLLECTION_CATEGORY_RULES) {
    const content = files[rule.sourceFile];
    if (!content) {
      continue;
    }

    const matches = content.matchAll(/\\input\{lieder\/(.+?)\}/g);
    for (const match of matches) {
      const filename = normaliseSongFilename(match[1] ?? "");
      if (!filename) {
        continue;
      }

      const categories = index.get(filename) ?? new Set<string>();
      categories.add(rule.category);
      index.set(filename, categories);
    }
  }

  return new Map(
    Array.from(index.entries()).map(([filename, categories]) => [
      filename,
      Array.from(categories).sort(),
    ]),
  );
}

export function inferSongTaxonomy(input: SongTaxonomyInput): SongTaxonomy {
  const categories = new Set(
    (input.collectionCategories ?? []).map((category) =>
      normaliseName(category),
    ),
  );
  const tags = new Set<string>();

  const metadataText = Object.values(input.metadata ?? {})
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )
    .join(" ");
  const sourceText =
    `${input.title} ${input.content} ${metadataText}`.toLowerCase();

  const germanScore = countWordMatches(sourceText, LANGUAGE_STOP_WORDS.German);
  const englishScore = countWordMatches(
    sourceText,
    LANGUAGE_STOP_WORDS.English,
  );

  if (germanScore > englishScore && germanScore > 0) {
    tags.add("German");
  } else if (englishScore > germanScore && englishScore > 0) {
    tags.add("English");
  }

  for (const rule of KEYWORD_TAG_RULES) {
    if (rule.patterns.some((pattern) => sourceText.includes(pattern))) {
      tags.add(rule.tag);
    }
  }

  return {
    categories: Array.from(categories).sort(),
    tags: Array.from(tags).sort(),
  };
}
