import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";
import { logActivity } from "$lib/server/activityLog";

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw error(401, "Unauthorized");

  const originalSongbook = await prisma.songbook.findUnique({
    where: { id: params.id },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        include: {
          songs: {
            include: {
              songVersion: true,
            },
          },
        },
      },
    },
  });

  if (!originalSongbook) {
    throw error(404, "Songbook not found");
  }

  const body = await request.json();
  const { title } = body;

  const latestVersion = originalSongbook.versions[0];
  const forkedSongbook = await prisma.songbook.create({
    data: {
      ownerId: session.user.id!,
      forkedFromId: originalSongbook.id,
      versions: {
        create: {
          title: title || latestVersion.title,
          description: latestVersion.description,
          songs: {
            create: latestVersion.songs.map((s) => ({
              songVersionId: s.songVersionId,
              order: s.order,
            })),
          },
        },
      },
    },
    include: {
      versions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  await logActivity({
    actorId: session.user.id!,
    action: "SONGBOOK_FORKED",
    resourceType: "SONGBOOK",
    resourceId: forkedSongbook.id,
    sourceResourceId: originalSongbook.id,
    sourceResourceType: "SONGBOOK",
    metadata: { title: forkedSongbook.versions[0]?.title },
  });

  return json(forkedSongbook, { status: 201 });
};
