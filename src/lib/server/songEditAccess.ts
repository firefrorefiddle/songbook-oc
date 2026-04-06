import type { PrismaClient } from "@prisma/client";

type PrismaSubset = Pick<PrismaClient, "song" | "collaboration">;

/**
 * Owner or anyone with a song collaboration row can edit song-level metadata
 * (versions, tags, categories). Public viewers without collaboration cannot.
 */
export async function userCanEditSong(
  prisma: PrismaSubset,
  userId: string,
  songId: string,
): Promise<boolean> {
  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: { ownerId: true },
  });
  if (!song) {
    return false;
  }
  if (song.ownerId === userId) {
    return true;
  }
  const collab = await prisma.collaboration.findUnique({
    where: { userId_songId: { userId, songId } },
  });
  return !!collab;
}
