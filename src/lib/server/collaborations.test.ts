import { beforeEach, describe, expect, it, vi } from "vitest";

const sendCollaboratorAddedEmail = vi.hoisted(() => vi.fn());

vi.mock("./email", () => ({
  sendCollaboratorAddedEmail,
}));

import {
  addSongCollaborator,
  addSongbookCollaborator,
  removeSongbookCollaborator,
} from "./collaborations";

describe("addSongCollaborator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendCollaboratorAddedEmail.mockResolvedValue({
      status: "SENT",
      transport: "log",
    });
  });

  it("does not send email when publicBaseUrl is omitted", async () => {
    const prisma = {
      collaboration: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
      activityLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    } as any;

    await addSongCollaborator(prisma, {
      actorId: "actor-1",
      songId: "song-1",
      targetUserId: "user-2",
      targetUserDisplayName: "Target",
    });

    expect(sendCollaboratorAddedEmail).not.toHaveBeenCalled();
  });

  it("sends collaborator_added email after grant when publicBaseUrl is set", async () => {
    const prisma = {
      collaboration: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
      activityLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      song: {
        findUnique: vi.fn().mockResolvedValue({
          recommendedVersion: { title: "Resolved Title" },
          versions: [],
        }),
      },
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            email: "owner@example.org",
            firstName: "Olivia",
            lastName: "Owner",
            username: null,
            name: null,
          })
          .mockResolvedValueOnce({ email: "target@example.org" }),
      },
    } as any;

    await addSongCollaborator(prisma, {
      actorId: "actor-1",
      songId: "song-1",
      targetUserId: "user-2",
      targetUserDisplayName: "Target User",
      role: "EDITOR",
      publicBaseUrl: "https://songbook.example.org/",
    });

    expect(sendCollaboratorAddedEmail).toHaveBeenCalledWith({
      toEmail: "target@example.org",
      collaboratorDisplayName: "Target User",
      grantedByDisplayName: "Olivia Owner",
      resourceType: "song",
      resourceTitle: "Resolved Title",
      resourceUrl: "https://songbook.example.org/songs/song-1",
      role: "EDITOR",
    });
  });

  it("still completes the grant when the email helper throws", async () => {
    sendCollaboratorAddedEmail.mockRejectedValue(new Error("smtp down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const prisma = {
      collaboration: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
      activityLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      song: {
        findUnique: vi.fn().mockResolvedValue({
          recommendedVersion: null,
          versions: [{ title: "Fallback Title" }],
        }),
      },
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            email: "o@example.org",
            firstName: "O",
            lastName: null,
            username: null,
            name: null,
          })
          .mockResolvedValueOnce({ email: "t@example.org" }),
      },
    } as any;

    await addSongCollaborator(prisma, {
      actorId: "actor-1",
      songId: "song-1",
      targetUserId: "user-2",
      targetUserDisplayName: "T",
      publicBaseUrl: "https://x.example",
    });

    expect(prisma.collaboration.create).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("sends collaborator_added for a songbook with latest version title", async () => {
    const prisma = {
      collaboration: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
      activityLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      songbook: {
        findUnique: vi.fn().mockResolvedValue({
          versions: [{ title: "Winter 2026" }],
        }),
      },
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            email: "owner@example.org",
            firstName: null,
            lastName: null,
            username: "olivia",
            name: null,
          })
          .mockResolvedValueOnce({ email: "buddy@example.org" }),
      },
    } as any;

    await addSongbookCollaborator(prisma, {
      actorId: "actor-1",
      songbookId: "sb-9",
      targetUserId: "user-2",
      targetUserDisplayName: "Buddy",
      publicBaseUrl: "https://app.example",
    });

    expect(sendCollaboratorAddedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: "songbook",
        resourceTitle: "Winter 2026",
        resourceUrl: "https://app.example/songbooks/sb-9",
        toEmail: "buddy@example.org",
      }),
    );
  });
});

describe("removeSongbookCollaborator", () => {
  it("removes collaboration row and writes activity log", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const create = vi.fn().mockResolvedValue({});
    const prisma = {
      collaboration: { deleteMany },
      activityLog: { create },
    } as any;

    await removeSongbookCollaborator(prisma, {
      actorId: "owner-1",
      songbookId: "sb-1",
      targetUserId: "user-2",
      targetUserDisplayName: "Pat",
    });

    expect(deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-2", songbookId: "sb-1" },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "owner-1",
        action: "COLLABORATOR_REMOVED",
        resourceType: "SONGBOOK",
        resourceId: "sb-1",
        metadata: JSON.stringify({
          collaboratorId: "user-2",
          collaboratorDisplayName: "Pat",
        }),
      }),
    });
  });
});
