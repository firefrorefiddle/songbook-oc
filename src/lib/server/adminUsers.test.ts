import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAdminUsersOverview,
  resendInvite,
  setUserActiveState,
} from "./adminUsers";

function makePrismaMock() {
  return {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    invite: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  } as any;
}

describe("adminUsers helpers", () => {
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
  });

  it("builds user and pending invite rows for the admin page", async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        email: "user@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
        username: "ada",
        name: null,
        role: "ADMIN",
        isActive: true,
        deactivatedAt: null,
        createdAt: new Date("2026-04-01T09:00:00Z"),
        invite: { emailVerifiedAt: new Date("2026-04-01T10:00:00Z") },
        _count: {
          ownedSongs: 3,
          ownedSongbooks: 1,
          collaborations: 2,
          invitesSent: 4,
        },
      },
    ]);
    prisma.invite.findMany.mockResolvedValue([
      {
        id: "invite-1",
        email: "pending@example.com",
        role: "USER",
        emailVerifiedAt: null,
        expiresAt: new Date("2099-04-10T10:00:00Z"),
        sentBy: {
          email: "admin@example.com",
          firstName: "Grace",
          lastName: "Hopper",
          username: "grace",
          name: null,
        },
        inviteCollaborations: [{ id: "ic-1" }, { id: "ic-2" }],
      },
    ]);

    const result = await getAdminUsersOverview(prisma);

    expect(result.users).toEqual([
      expect.objectContaining({
        email: "user@example.com",
        displayName: "Ada Lovelace",
        verificationState: "verified",
        ownedSongsCount: 3,
        collaborationsCount: 2,
      }),
    ]);
    expect(result.invites).toEqual([
      expect.objectContaining({
        email: "pending@example.com",
        sentByName: "Grace Hopper",
        status: "pending",
        sharedItemsCount: 2,
      }),
    ]);
  });

  it("prevents an admin from deactivating their own account", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "admin-1",
      role: "ADMIN",
      isActive: true,
    });

    await expect(
      setUserActiveState(prisma, {
        actorUserId: "admin-1",
        targetUserId: "admin-1",
        isActive: false,
      }),
    ).rejects.toThrow("You cannot deactivate your own account");
  });

  it("prevents deactivating the last active admin", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "admin-2",
      role: "ADMIN",
      isActive: true,
    });
    prisma.user.count.mockResolvedValue(0);

    await expect(
      setUserActiveState(prisma, {
        actorUserId: "admin-1",
        targetUserId: "admin-2",
        isActive: false,
      }),
    ).rejects.toThrow("You cannot deactivate the last active admin");
  });

  it("updates deactivation state when the change is allowed", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-2",
      role: "USER",
      isActive: true,
    });
    prisma.user.update.mockResolvedValue({
      id: "user-2",
      role: "USER",
      isActive: false,
    });

    await setUserActiveState(prisma, {
      actorUserId: "admin-1",
      targetUserId: "user-2",
      isActive: false,
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-2" },
        data: expect.objectContaining({
          isActive: false,
          deactivatedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("resends an unused invite with a fresh token and expiry", async () => {
    prisma.invite.findUnique.mockResolvedValue({
      id: "invite-2",
      email: "pending@example.com",
      usedAt: null,
    });
    prisma.invite.update.mockResolvedValue({
      email: "pending@example.com",
      token: "fresh-token",
      expiresAt: new Date("2099-04-08T12:00:00Z"),
    });

    const result = await resendInvite(prisma, {
      actorUserId: "admin-1",
      inviteId: "invite-2",
    });

    expect(prisma.invite.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "invite-2" },
        data: expect.objectContaining({
          sentById: "admin-1",
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      }),
    );
    expect(result.signupUrl).toContain("fresh-token");
  });
});
