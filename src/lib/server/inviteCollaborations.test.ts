import { describe, it, expect, vi, beforeEach } from "vitest";
import { materialiseInviteCollaborations } from "./inviteCollaborations";

// Minimal Prisma mock that tracks calls
function makePrismaMock(songs: { id: string }[], songbooks: { id: string }[]) {
  const createMany = vi.fn().mockResolvedValue({ count: 0 });
  const songFindMany = vi.fn().mockResolvedValue(songs);
  const songbookFindMany = vi.fn().mockResolvedValue(songbooks);

  return {
    song: { findMany: songFindMany },
    songbook: { findMany: songbookFindMany },
    collaboration: { createMany },
    _mocks: { createMany, songFindMany, songbookFindMany },
  } as unknown as Parameters<typeof materialiseInviteCollaborations>[0];
}

describe("materialiseInviteCollaborations", () => {
  it("does nothing when there are no invite collaborations", async () => {
    const prisma = makePrismaMock([], []);
    await materialiseInviteCollaborations(prisma, "user-1", []);
    expect((prisma as any)._mocks.createMany).not.toHaveBeenCalled();
  });

  it("creates song collaborations for all non-archived songs of the owner", async () => {
    const songs = [{ id: "song-1" }, { id: "song-2" }];
    const prisma = makePrismaMock(songs, []);

    await materialiseInviteCollaborations(prisma, "user-1", [
      { resourceType: "song", ownerId: "owner-1", role: "EDITOR" },
    ]);

    expect((prisma as any)._mocks.songFindMany).toHaveBeenCalledWith({
      where: { ownerId: "owner-1", isArchived: false },
      select: { id: true },
    });

    expect((prisma as any)._mocks.createMany).toHaveBeenCalledWith({
      data: [
        { userId: "user-1", songId: "song-1", role: "EDITOR" },
        { userId: "user-1", songId: "song-2", role: "EDITOR" },
      ],
    });
  });

  it("creates songbook collaborations for all non-archived songbooks of the owner", async () => {
    const songbooks = [{ id: "sb-1" }];
    const prisma = makePrismaMock([], songbooks);

    await materialiseInviteCollaborations(prisma, "user-1", [
      { resourceType: "songbook", ownerId: "owner-2", role: "EDITOR" },
    ]);

    expect((prisma as any)._mocks.songbookFindMany).toHaveBeenCalledWith({
      where: { ownerId: "owner-2", isArchived: false },
      select: { id: true },
    });

    expect((prisma as any)._mocks.createMany).toHaveBeenCalledWith({
      data: [{ userId: "user-1", songbookId: "sb-1", role: "EDITOR" }],
    });
  });

  it("silently skips when owner has no songs (deleted before sign-up)", async () => {
    const prisma = makePrismaMock([], []);

    await materialiseInviteCollaborations(prisma, "user-1", [
      { resourceType: "song", ownerId: "owner-gone", role: "EDITOR" },
    ]);

    // findMany was called but createMany must not be called (no songs found)
    expect((prisma as any)._mocks.songFindMany).toHaveBeenCalled();
    expect((prisma as any)._mocks.createMany).not.toHaveBeenCalled();
  });

  it("handles multiple invite collaborations in one pass", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 0 });
    const prismaMock = {
      song: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ id: "song-1" }])
          .mockResolvedValueOnce([{ id: "song-3" }]),
      },
      songbook: {
        findMany: vi.fn().mockResolvedValue([{ id: "sb-1" }]),
      },
      collaboration: { createMany },
    } as unknown as Parameters<typeof materialiseInviteCollaborations>[0];

    await materialiseInviteCollaborations(prismaMock, "user-1", [
      { resourceType: "song", ownerId: "owner-1", role: "EDITOR" },
      { resourceType: "songbook", ownerId: "owner-2", role: "EDITOR" },
      { resourceType: "song", ownerId: "owner-3", role: "EDITOR" },
    ]);

    // 3 entries all found resources → createMany called 3 times
    expect(createMany).toHaveBeenCalledTimes(3);
  });

  it("uses the correct prisma mock throughout", async () => {
    const songs = [{ id: "song-a" }];
    const songbooks = [{ id: "sb-a" }];
    const prisma = makePrismaMock(songs, songbooks);

    await materialiseInviteCollaborations(prisma, "user-x", [
      { resourceType: "song", ownerId: "o1", role: "EDITOR" },
      { resourceType: "songbook", ownerId: "o2", role: "EDITOR" },
    ]);

    expect((prisma as any)._mocks.createMany).toHaveBeenCalledTimes(2);
  });
});
