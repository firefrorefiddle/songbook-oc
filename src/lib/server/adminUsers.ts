import { randomBytes } from "crypto";

import type { PrismaClient } from "@prisma/client";

const INVITE_LIFETIME_DAYS = 7;

type AdminPrisma = Pick<PrismaClient, "invite" | "user">;

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  role: "USER" | "ADMIN";
  isActive: boolean;
  deactivatedAt: Date | null;
  createdAt: Date;
  verificationState: "verified" | "not_verified" | "not_applicable";
  ownedSongsCount: number;
  ownedSongbooksCount: number;
  collaborationsCount: number;
  invitesSentCount: number;
}

export interface AdminInviteRow {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  status: "pending" | "verified" | "expired";
  emailVerifiedAt: Date | null;
  expiresAt: Date;
  sentByName: string;
  sharedItemsCount: number;
}

export function getUserDisplayName(user: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  name?: string | null;
}) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.username || user.name || user.email;
}

export async function getAdminUsersOverview(prisma: AdminPrisma) {
  const [users, invites] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        deactivatedAt: true,
        createdAt: true,
        invite: {
          select: {
            emailVerifiedAt: true,
          },
        },
        _count: {
          select: {
            ownedSongs: true,
            ownedSongbooks: true,
            collaborations: true,
            invitesSent: true,
          },
        },
      },
    }),
    prisma.invite.findMany({
      where: { usedAt: null },
      orderBy: { expiresAt: "desc" },
      include: {
        sentBy: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            username: true,
            name: true,
          },
        },
        inviteCollaborations: {
          select: { id: true },
        },
      },
    }),
  ]);

  const userRows: AdminUserRow[] = users.map((user) => ({
    id: user.id,
    email: user.email,
    displayName: getUserDisplayName(user),
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    role: user.role,
    isActive: user.isActive,
    deactivatedAt: user.deactivatedAt,
    createdAt: user.createdAt,
    verificationState: user.invite
      ? user.invite.emailVerifiedAt
        ? "verified"
        : "not_verified"
      : "not_applicable",
    ownedSongsCount: user._count.ownedSongs,
    ownedSongbooksCount: user._count.ownedSongbooks,
    collaborationsCount: user._count.collaborations,
    invitesSentCount: user._count.invitesSent,
  }));

  const inviteRows: AdminInviteRow[] = invites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    status:
      invite.expiresAt < new Date()
        ? "expired"
        : invite.emailVerifiedAt
          ? "verified"
          : "pending",
    emailVerifiedAt: invite.emailVerifiedAt,
    expiresAt: invite.expiresAt,
    sentByName: getUserDisplayName(invite.sentBy),
    sharedItemsCount: invite.inviteCollaborations.length,
  }));

  return { users: userRows, invites: inviteRows };
}

export async function setUserActiveState(
  prisma: AdminPrisma,
  input: {
    actorUserId: string;
    targetUserId: string;
    isActive: boolean;
  },
) {
  const targetUser = await prisma.user.findUnique({
    where: { id: input.targetUserId },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!targetUser) {
    throw new Error("User not found");
  }

  if (input.actorUserId === input.targetUserId && !input.isActive) {
    throw new Error("You cannot deactivate your own account");
  }

  if (targetUser.isActive === input.isActive) {
    return targetUser;
  }

  if (!input.isActive && targetUser.role === "ADMIN") {
    const otherActiveAdminCount = await prisma.user.count({
      where: {
        role: "ADMIN",
        isActive: true,
        NOT: { id: targetUser.id },
      },
    });

    if (otherActiveAdminCount === 0) {
      throw new Error("You cannot deactivate the last active admin");
    }
  }

  return prisma.user.update({
    where: { id: targetUser.id },
    data: {
      isActive: input.isActive,
      deactivatedAt: input.isActive ? null : new Date(),
    },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });
}

export async function resendInvite(
  prisma: AdminPrisma,
  input: {
    actorUserId: string;
    inviteId: string;
  },
) {
  const invite = await prisma.invite.findUnique({
    where: { id: input.inviteId },
    select: {
      id: true,
      email: true,
      usedAt: true,
    },
  });

  if (!invite) {
    throw new Error("Invite not found");
  }

  if (invite.usedAt) {
    throw new Error("Invite has already been used");
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_LIFETIME_DAYS);

  const updatedInvite = await prisma.invite.update({
    where: { id: invite.id },
    data: {
      token,
      expiresAt,
      sentById: input.actorUserId,
    },
    select: {
      email: true,
      token: true,
      expiresAt: true,
    },
  });

  return {
    email: updatedInvite.email,
    expiresAt: updatedInvite.expiresAt,
    signupUrl: `/signup?token=${updatedInvite.token}&email=${encodeURIComponent(updatedInvite.email)}`,
  };
}
