import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";
import { updateSongVersionSchema } from "$lib/schemas";
import { logActivity } from "$lib/server/activityLog";

export const GET: RequestHandler = async ({ params }) => {
  const song = await prisma.song.findUnique({
    where: { id: params.id },
    include: {
      recommendedVersion: true,
      versions: {
        orderBy: { createdAt: "desc" },
      },
      tags: { include: { tag: true } },
      categories: { include: { category: true } },
    },
  });

  if (!song) {
    throw error(404, "Song not found");
  }

  return json(song);
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw error(401, "Unauthorized");

  const body = await request.json();
  const parsed = updateSongVersionSchema.safeParse(body);

  if (!parsed.success) {
    throw error(400, parsed.error.errors[0].message);
  }

  const { title, author, content, metadata } = parsed.data;

  const song = await prisma.song.findUnique({
    where: { id: params.id },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!song) {
    throw error(404, "Song not found");
  }

  const latestVersion = song.versions[0];

  if (title || author || content || metadata) {
    await prisma.songVersion.create({
      data: {
        songId: params.id,
        title: title || latestVersion?.title || "",
        author: author !== undefined ? author : latestVersion?.author,
        content: content || latestVersion?.content || "",
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
  }

  const updatedSong = await prisma.song.findUnique({
    where: { id: params.id },
    include: {
      recommendedVersion: true,
      versions: { orderBy: { createdAt: "desc" } },
      tags: { include: { tag: true } },
      categories: { include: { category: true } },
    },
  });

  return json(updatedSong);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw error(401, "Unauthorized");

  const song = await prisma.song.findUnique({ where: { id: params.id } });
  if (!song) {
    throw error(404, "Song not found");
  }

  await prisma.song.update({
    where: { id: params.id },
    data: { isArchived: true },
  });

  await logActivity({
    actorId: session.user.id!,
    action: "SONG_ARCHIVED",
    resourceType: "SONG",
    resourceId: params.id,
  });

  return json({ success: true });
};
