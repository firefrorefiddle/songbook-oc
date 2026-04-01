import { describe, expect, it } from "vitest";

import {
  compareSongVersions,
  getPreferredSongVersion,
  parseSongMetadata,
} from "./songVersions";

describe("songVersions", () => {
  it("prefers the explicitly recommended version over the latest version", () => {
    const latestVersion = {
      id: "latest",
      title: "Song",
      author: null,
      content: "Latest",
      metadata: "{}",
      createdAt: new Date("2026-04-01T10:00:00.000Z"),
    };

    const recommendedVersion = {
      id: "recommended",
      title: "Song",
      author: null,
      content: "Recommended",
      metadata: "{}",
      createdAt: new Date("2026-03-31T10:00:00.000Z"),
    };

    expect(
      getPreferredSongVersion({
        recommendedVersionId: recommendedVersion.id,
        recommendedVersion,
        versions: [latestVersion, recommendedVersion],
      }),
    ).toEqual(recommendedVersion);
  });

  it("falls back to the latest version when no recommendation exists", () => {
    const latestVersion = {
      id: "latest",
      title: "Song",
      author: null,
      content: "Latest",
      metadata: "{}",
      createdAt: new Date("2026-04-01T10:00:00.000Z"),
    };

    expect(
      getPreferredSongVersion({
        recommendedVersionId: null,
        recommendedVersion: null,
        versions: [latestVersion],
      }),
    ).toEqual(latestVersion);
  });

  it("parses only string metadata values", () => {
    expect(parseSongMetadata('{"copyright":"CC0","numbering":4}')).toEqual({
      copyright: "CC0",
    });
  });

  it("builds field and line differences between two versions", () => {
    const comparison = compareSongVersions(
      {
        id: "current",
        title: "Amazing Grace",
        author: "Alice",
        content: ["C G", "Amazing grace", "How sweet the sound"].join("\n"),
        metadata: '{"copyright":"CCLI"}',
        createdAt: new Date("2026-04-01T10:00:00.000Z"),
      },
      {
        id: "older",
        title: "Amazing Grace (Alt)",
        author: "Bob",
        content: ["C G", "Amazing grace", "That saved a wretch"].join("\n"),
        metadata: '{"copyright":"Public Domain","reference":"123"}',
        createdAt: new Date("2026-03-31T10:00:00.000Z"),
      },
    );

    expect(comparison.fieldDifferences).toEqual([
      {
        field: "Title",
        currentValue: "Amazing Grace",
        comparedValue: "Amazing Grace (Alt)",
      },
      {
        field: "Author",
        currentValue: "Alice",
        comparedValue: "Bob",
      },
      {
        field: "Metadata: copyright",
        currentValue: "CCLI",
        comparedValue: "Public Domain",
      },
      {
        field: "Metadata: reference",
        currentValue: "",
        comparedValue: "123",
      },
    ]);
    expect(comparison.contentDifferences).toEqual([
      { type: "same", value: "C G" },
      { type: "same", value: "Amazing grace" },
      { type: "added", value: "That saved a wretch" },
      { type: "removed", value: "How sweet the sound" },
    ]);
    expect(comparison.hasDifferences).toBe(true);
  });
});
