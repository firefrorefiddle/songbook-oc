import type { PrismaClient } from "@prisma/client";

import { sendCollaboratorAddedEmail } from "./email";

type CollabPrisma = Pick<
  PrismaClient,
  | "user"
  | "song"
  | "songbook"
  | "collaboration"
  | "$transaction"
  | "activityLog"
>;

function getActorName(user: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  name?: string | null;
  email: string;
}): string {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    user.name ||
    user.email
  );
}

async function notifyCollaboratorAdded(
  prisma: CollabPrisma,
  params: {
    publicBaseUrl: string;
    resourceType: "song" | "songbook";
    resourceId: string;
    actorId: string;
    targetUserId: string;
    targetUserDisplayName: string;
    role: "EDITOR" | "ADMIN";
  },
): Promise<void> {
  const base = params.publicBaseUrl.replace(/\/+$/u, "");

  try {
    let resourceTitle: string;
    let resourceUrl: string;

    if (params.resourceType === "song") {
      const song = await prisma.song.findUnique({
        where: { id: params.resourceId },
        select: {
          recommendedVersion: { select: { title: true } },
          versions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { title: true },
          },
        },
      });
      resourceTitle =
        song?.recommendedVersion?.title ??
        song?.versions[0]?.title ??
        "Song";
      resourceUrl = `${base}/songs/${params.resourceId}`;
    } else {
      const songbook = await prisma.songbook.findUnique({
        where: { id: params.resourceId },
        select: {
          versions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { title: true },
          },
        },
      });
      resourceTitle = songbook?.versions[0]?.title ?? "Songbook";
      resourceUrl = `${base}/songbooks/${params.resourceId}`;
    }

    const [actor, target] = await Promise.all([
      prisma.user.findUnique({
        where: { id: params.actorId },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          username: true,
          name: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: params.targetUserId },
        select: { email: true },
      }),
    ]);

    if (!actor || !target?.email) {
      return;
    }

    await sendCollaboratorAddedEmail({
      toEmail: target.email,
      collaboratorDisplayName: params.targetUserDisplayName,
      grantedByDisplayName: getActorName(actor),
      resourceType: params.resourceType,
      resourceTitle,
      resourceUrl,
      role: params.role,
    });
  } catch (error) {
    console.error(
      "[collaborations] collaborator_added email notification failed:",
      error,
    );
  }
}

export interface CollaboratorInfo {
  id: string;
  displayName: string;
  email: string;
  role: "EDITOR" | "ADMIN";
}

export interface OwnershipInfo {
  id: string;
  displayName: string;
  email: string;
}

export async function getSongCollaborators(
  prisma: CollabPrisma,
  songId: string,
): Promise<CollaboratorInfo[]> {
  const collaborations = await prisma.collaboration.findMany({
    where: { songId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          username: true,
          name: true,
        },
      },
    },
  });

  return collaborations.map((c) => ({
    id: c.user.id,
    displayName:
      [c.user.firstName, c.user.lastName].filter(Boolean).join(" ").trim() ||
      c.user.username ||
      c.user.name ||
      c.user.email,
    email: c.user.email,
    role: c.role,
  }));
}

export async function getSongbookCollaborators(
  prisma: CollabPrisma,
  songbookId: string,
): Promise<CollaboratorInfo[]> {
  const collaborations = await prisma.collaboration.findMany({
    where: { songbookId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          username: true,
          name: true,
        },
      },
    },
  });

  return collaborations.map((c) => ({
    id: c.user.id,
    displayName:
      [c.user.firstName, c.user.lastName].filter(Boolean).join(" ").trim() ||
      c.user.username ||
      c.user.name ||
      c.user.email,
    email: c.user.email,
    role: c.role,
  }));
}

export async function addSongCollaborator(
  prisma: CollabPrisma,
  input: {
    actorId: string;
    songId: string;
    targetUserId: string;
    targetUserDisplayName: string;
    role?: "EDITOR" | "ADMIN";
    /** When set, sends a transactional email after the grant (failures are logged only). */
    publicBaseUrl?: string;
  },
): Promise<void> {
  const existing = await prisma.collaboration.findFirst({
    where: {
      userId: input.targetUserId,
      songId: input.songId,
    },
  });

  if (existing) {
    throw new Error("User is already a collaborator");
  }

  await prisma.collaboration.create({
    data: {
      songId: input.songId,
      userId: input.targetUserId,
      role: input.role || "EDITOR",
    },
  });

  await prisma.activityLog.create({
    data: {
      actorId: input.actorId,
      action: "COLLABORATOR_ADDED",
      resourceType: "SONG",
      resourceId: input.songId,
      metadata: JSON.stringify({
        collaboratorId: input.targetUserId,
        collaboratorDisplayName: input.targetUserDisplayName,
        role: input.role || "EDITOR",
      }),
    },
  });

  if (input.publicBaseUrl) {
    await notifyCollaboratorAdded(prisma, {
      publicBaseUrl: input.publicBaseUrl,
      resourceType: "song",
      resourceId: input.songId,
      actorId: input.actorId,
      targetUserId: input.targetUserId,
      targetUserDisplayName: input.targetUserDisplayName,
      role: input.role || "EDITOR",
    });
  }
}

export async function removeSongCollaborator(
  prisma: CollabPrisma,
  input: {
    actorId: string;
    songId: string;
    targetUserId: string;
    targetUserDisplayName: string;
  },
): Promise<void> {
  await prisma.collaboration.deleteMany({
    where: {
      userId: input.targetUserId,
      songId: input.songId,
    },
  });

  await prisma.activityLog.create({
    data: {
      actorId: input.actorId,
      action: "COLLABORATOR_REMOVED",
      resourceType: "SONG",
      resourceId: input.songId,
      metadata: JSON.stringify({
        collaboratorId: input.targetUserId,
        collaboratorDisplayName: input.targetUserDisplayName,
      }),
    },
  });
}

export async function transferSongOwnership(
  prisma: CollabPrisma,
  input: {
    actorId: string;
    songId: string;
    currentOwnerId: string;
    currentOwnerDisplayName: string;
    newOwnerId: string;
    newOwnerDisplayName: string;
  },
): Promise<void> {
  const song = await prisma.song.findUnique({
    where: { id: input.songId },
    select: { ownerId: true },
  });

  if (!song) {
    throw new Error("Song not found");
  }

  if (song.ownerId !== input.currentOwnerId) {
    throw new Error("You are not the owner");
  }

  if (input.currentOwnerId === input.newOwnerId) {
    return;
  }

  await prisma.$transaction([
    prisma.song.update({
      where: { id: input.songId },
      data: { ownerId: input.newOwnerId },
    }),
    prisma.collaboration.upsert({
      where: {
        userId_songId: {
          userId: input.currentOwnerId,
          songId: input.songId,
        },
      },
      update: { role: "EDITOR" },
      create: {
        userId: input.currentOwnerId,
        songId: input.songId,
        role: "EDITOR",
      },
    }),
    prisma.activityLog.create({
      data: {
        actorId: input.actorId,
        action: "OWNERSHIP_TRANSFERRED",
        resourceType: "SONG",
        resourceId: input.songId,
        metadata: JSON.stringify({
          fromUserId: input.currentOwnerId,
          fromUserDisplayName: input.currentOwnerDisplayName,
          toUserId: input.newOwnerId,
          toUserDisplayName: input.newOwnerDisplayName,
        }),
      },
    }),
  ]);
}

export async function addSongbookCollaborator(
  prisma: CollabPrisma,
  input: {
    actorId: string;
    songbookId: string;
    targetUserId: string;
    targetUserDisplayName: string;
    role?: "EDITOR" | "ADMIN";
    /** When set, sends a transactional email after the grant (failures are logged only). */
    publicBaseUrl?: string;
  },
): Promise<void> {
  const existing = await prisma.collaboration.findFirst({
    where: {
      userId: input.targetUserId,
      songbookId: input.songbookId,
    },
  });

  if (existing) {
    throw new Error("User is already a collaborator");
  }

  await prisma.collaboration.create({
    data: {
      songbookId: input.songbookId,
      userId: input.targetUserId,
      role: input.role || "EDITOR",
    },
  });

  await prisma.activityLog.create({
    data: {
      actorId: input.actorId,
      action: "COLLABORATOR_ADDED",
      resourceType: "SONGBOOK",
      resourceId: input.songbookId,
      metadata: JSON.stringify({
        collaboratorId: input.targetUserId,
        collaboratorDisplayName: input.targetUserDisplayName,
        role: input.role || "EDITOR",
      }),
    },
  });

  if (input.publicBaseUrl) {
    await notifyCollaboratorAdded(prisma, {
      publicBaseUrl: input.publicBaseUrl,
      resourceType: "songbook",
      resourceId: input.songbookId,
      actorId: input.actorId,
      targetUserId: input.targetUserId,
      targetUserDisplayName: input.targetUserDisplayName,
      role: input.role || "EDITOR",
    });
  }
}

export async function removeSongbookCollaborator(
  prisma: CollabPrisma,
  input: {
    actorId: string;
    songbookId: string;
    targetUserId: string;
    targetUserDisplayName: string;
  },
): Promise<void> {
  await prisma.collaboration.deleteMany({
    where: {
      userId: input.targetUserId,
      songbookId: input.songbookId,
    },
  });

  await prisma.activityLog.create({
    data: {
      actorId: input.actorId,
      action: "COLLABORATOR_REMOVED",
      resourceType: "SONGBOOK",
      resourceId: input.songbookId,
      metadata: JSON.stringify({
        collaboratorId: input.targetUserId,
        collaboratorDisplayName: input.targetUserDisplayName,
      }),
    },
  });
}

export async function transferSongbookOwnership(
  prisma: CollabPrisma,
  input: {
    actorId: string;
    songbookId: string;
    currentOwnerId: string;
    currentOwnerDisplayName: string;
    newOwnerId: string;
    newOwnerDisplayName: string;
  },
): Promise<void> {
  const songbook = await prisma.songbook.findUnique({
    where: { id: input.songbookId },
    select: { ownerId: true },
  });

  if (!songbook) {
    throw new Error("Songbook not found");
  }

  if (songbook.ownerId !== input.currentOwnerId) {
    throw new Error("You are not the owner");
  }

  if (input.currentOwnerId === input.newOwnerId) {
    return;
  }

  await prisma.$transaction([
    prisma.songbook.update({
      where: { id: input.songbookId },
      data: { ownerId: input.newOwnerId },
    }),
    prisma.collaboration.upsert({
      where: {
        userId_songbookId: {
          userId: input.currentOwnerId,
          songbookId: input.songbookId,
        },
      },
      update: { role: "EDITOR" },
      create: {
        userId: input.currentOwnerId,
        songbookId: input.songbookId,
        role: "EDITOR",
      },
    }),
    prisma.activityLog.create({
      data: {
        actorId: input.actorId,
        action: "OWNERSHIP_TRANSFERRED",
        resourceType: "SONGBOOK",
        resourceId: input.songbookId,
        metadata: JSON.stringify({
          fromUserId: input.currentOwnerId,
          fromUserDisplayName: input.currentOwnerDisplayName,
          toUserId: input.newOwnerId,
          toUserDisplayName: input.newOwnerDisplayName,
        }),
      },
    }),
  ]);
}

export async function getActiveUsers(prisma: CollabPrisma): Promise<
  {
    id: string;
    displayName: string;
    email: string;
  }[]
> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      username: true,
      name: true,
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
  });

  return users.map((u) => ({
    id: u.id,
    displayName:
      [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
      u.username ||
      u.name ||
      u.email,
    email: u.email,
  }));
}

export async function getOwnerInfo(
  prisma: CollabPrisma,
  ownerId: string,
): Promise<OwnershipInfo> {
  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      username: true,
      name: true,
    },
  });

  if (!user) {
    throw new Error("Owner not found");
  }

  return {
    id: user.id,
    displayName:
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      user.username ||
      user.name ||
      user.email,
    email: user.email,
  };
}
