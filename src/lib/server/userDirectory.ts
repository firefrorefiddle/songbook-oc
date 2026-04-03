import type { PrismaClient } from "@prisma/client";

type UserDirectoryPrisma = Pick<
  PrismaClient,
  "user" | "song" | "songbook" | "collaboration"
>;

export interface UserDirectoryRow {
  id: string;
  displayName: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  createdAt: Date;
  ownedSongsCount: number;
  ownedSongbooksCount: number;
  sharedWithCurrentUser: boolean;
}

export async function searchUsers(
  prisma: UserDirectoryPrisma,
  currentUserId: string,
  search: string,
): Promise<UserDirectoryRow[]> {
  const whereClause = search
    ? {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { username: { contains: search } },
          { email: { contains: search } },
          { name: { contains: search } },
        ],
      }
    : {};

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      ...whereClause,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      username: true,
      name: true,
      createdAt: true,
      _count: {
        select: {
          ownedSongs: true,
          ownedSongbooks: true,
        },
      },
      collaborations: {
        where: { userId: currentUserId },
        select: { id: true },
      },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
    take: 50,
  });

  return users.map((user) => ({
    id: user.id,
    displayName:
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      user.username ||
      user.name ||
      user.email,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    createdAt: user.createdAt,
    ownedSongsCount: user._count.ownedSongs,
    ownedSongbooksCount: user._count.ownedSongbooks,
    sharedWithCurrentUser: user.collaborations.length > 0,
  }));
}

export async function getSharedWithMe(
  prisma: UserDirectoryPrisma,
  currentUserId: string,
) {
  const collaborations = await prisma.collaboration.findMany({
    where: { userId: currentUserId },
    include: {
      song: {
        select: {
          id: true,
          isArchived: true,
        },
      },
      songbook: {
        include: {
          versions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  const songs = await prisma.song.findMany({
    where: {
      collaborations: { some: { userId: currentUserId } },
      isArchived: false,
    },
    include: {
      recommendedVersion: true,
      versions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  const songbooks = await prisma.songbook.findMany({
    where: {
      collaborations: { some: { userId: currentUserId } },
      isArchived: false,
    },
    include: {
      versions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return {
    songs: songs.map((song) => ({
      id: song.id,
      title:
        song.recommendedVersion?.title || song.versions[0]?.title || "Untitled",
      ownerId: song.ownerId,
    })),
    songbooks: songbooks.map((songbook) => ({
      id: songbook.id,
      title: songbook.versions[0]?.title || "Untitled",
      ownerId: songbook.ownerId,
    })),
  };
}
