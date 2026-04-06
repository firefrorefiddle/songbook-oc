import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getUserDirectoryRowById,
  searchUsers,
} from "./userDirectory";

function makePrismaMock() {
  return {
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  } as any;
}

describe("userDirectory", () => {
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
  });

  it("searchUsers maps publicBio onto rows", async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: "u1",
        email: "a@x.com",
        firstName: "A",
        lastName: "B",
        username: "ab",
        name: null,
        publicBio: "Organist",
        createdAt: new Date("2026-01-01"),
        _count: { ownedSongs: 1, ownedSongbooks: 2 },
        collaborations: [],
      },
    ]);

    const rows = await searchUsers(prisma, "viewer", "");
    expect(rows).toEqual([
      expect.objectContaining({
        id: "u1",
        displayName: "A B",
        publicBio: "Organist",
        ownedSongsCount: 1,
        ownedSongbooksCount: 2,
        sharedWithCurrentUser: false,
      }),
    ]);
  });

  it("getUserDirectoryRowById returns null when user missing", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const row = await getUserDirectoryRowById(prisma, "v1", "missing");
    expect(row).toBeNull();
  });

  it("getUserDirectoryRowById returns mapped row", async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: "u2",
      email: "c@x.com",
      firstName: null,
      lastName: null,
      username: "cee",
      name: null,
      publicBio: null,
      createdAt: new Date("2026-02-02"),
      _count: { ownedSongs: 0, ownedSongbooks: 1 },
      collaborations: [{ id: "c1" }],
    });

    const row = await getUserDirectoryRowById(prisma, "v1", "u2");
    expect(row).toEqual({
      id: "u2",
      displayName: "cee",
      email: "c@x.com",
      firstName: null,
      lastName: null,
      username: "cee",
      publicBio: null,
      createdAt: new Date("2026-02-02"),
      ownedSongsCount: 0,
      ownedSongbooksCount: 1,
      sharedWithCurrentUser: true,
    });
  });
});
