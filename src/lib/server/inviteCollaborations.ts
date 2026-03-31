import type { PrismaClient } from "@prisma/client";

/**
 * Materialises InviteCollaboration records into real Collaboration rows for a
 * newly-created user. Called from the signup handler after the user is created.
 *
 * For each pending InviteCollaboration we grant the new user editor access to
 * all non-archived songs or songbooks currently owned by the specified owner.
 * Resources that no longer exist (or have been archived) are silently skipped.
 */
export async function materialiseInviteCollaborations(
  prisma: PrismaClient,
  userId: string,
  inviteCollaborations: Array<{
    resourceType: string;
    ownerId: string;
    role: "EDITOR" | "ADMIN";
  }>,
): Promise<void> {
  for (const ic of inviteCollaborations) {
    if (ic.resourceType === "song") {
      const songs = await prisma.song.findMany({
        where: { ownerId: ic.ownerId, isArchived: false },
        select: { id: true },
      });
      if (songs.length > 0) {
        await prisma.collaboration.createMany({
          data: songs.map((s: { id: string }) => ({
            userId,
            songId: s.id,
            role: ic.role,
          })),
        });
      }
    } else if (ic.resourceType === "songbook") {
      const songbooks = await prisma.songbook.findMany({
        where: { ownerId: ic.ownerId, isArchived: false },
        select: { id: true },
      });
      if (songbooks.length > 0) {
        await prisma.collaboration.createMany({
          data: songbooks.map((sb: { id: string }) => ({
            userId,
            songbookId: sb.id,
            role: ic.role,
          })),
        });
      }
    }
  }
}
