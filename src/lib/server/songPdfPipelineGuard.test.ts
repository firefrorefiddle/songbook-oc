import { describe, expect, it } from "vitest";

import {
  normalizedSongVersionWritePayload,
  parseMetadataRecord,
} from "./songPdfPipelineGuard";

describe("songPdfPipelineGuard", () => {
  it("parses string metadata and ignores non-strings", () => {
    expect(parseMetadataRecord('{"a":"1","b":4}')).toEqual({ a: "1" });
  });

  it("normalizes song version payload for persistence", () => {
    const out = normalizedSongVersionWritePayload({
      title: "  Hi  ",
      author: "  A  ",
      content: "C\r\nx\0y",
      metadata: { copyright: "x\r" },
    });
    expect(out.title).toBe("Hi");
    expect(out.author).toBe("A");
    expect(out.content).toBe("C\nxy");
    expect(JSON.parse(out.metadata)).toEqual({ copyright: "x\n" });
  });
});
