import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";
import { createSongVersionSchema } from "$lib/schemas";
import { logActivity } from "$lib/server/activityLog";

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw error(401, "Unauthorized");

  const body = await request.json();
  const parsed = createSongVersionSchema.safeParse(body);

  if (!parsed.success) {
    throw error(400, parsed.error.errors[0].message);
  }

  const song = await prisma.song.findUnique({ where: { id: params.id } });
  if (!song) {
    throw error(404, "Song not found");
  }

  const { title, author, content, metadata } = parsed.data;

  const songVersion = await prisma.songVersion.create({
    data: {
      songId: params.id,
      title,
      author,
      content,
      metadata: JSON.stringify(metadata || {}),
    },
  });

  await logActivity({
    actorId: session.user.id!,
    action: "SONG_VERSION_CREATED",
    resourceType: "SONG",
    resourceId: params.id,
    metadata: { title },
  });

  return json(songVersion, { status: 201 });
};
