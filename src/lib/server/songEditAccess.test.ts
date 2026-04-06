import { beforeEach, describe, expect, it, vi } from "vitest";

import { userCanEditSong } from "./songEditAccess";

function makePrismaMock() {
  return {
    song: { findUnique: vi.fn() },
    collaboration: { findUnique: vi.fn() },
  };
}

describe("userCanEditSong", () => {
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
  });

  it("returns false when song is missing", async () => {
    prisma.song.findUnique.mockResolvedValue(null);
    await expect(userCanEditSong(prisma as any, "u1", "s1")).resolves.toBe(
      false,
    );
  });

  it("returns true for owner", async () => {
    prisma.song.findUnique.mockResolvedValue({ ownerId: "u1" });
    await expect(userCanEditSong(prisma as any, "u1", "s1")).resolves.toBe(
      true,
    );
    expect(prisma.collaboration.findUnique).not.toHaveBeenCalled();
  });

  it("returns true when user has a collaboration row", async () => {
    prisma.song.findUnique.mockResolvedValue({ ownerId: "owner" });
    prisma.collaboration.findUnique.mockResolvedValue({ id: "c1" });
    await expect(userCanEditSong(prisma as any, "u1", "s1")).resolves.toBe(
      true,
    );
  });

  it("returns false for public viewer without collaboration", async () => {
    prisma.song.findUnique.mockResolvedValue({ ownerId: "owner" });
    prisma.collaboration.findUnique.mockResolvedValue(null);
    await expect(userCanEditSong(prisma as any, "u1", "s1")).resolves.toBe(
      false,
    );
  });
});
