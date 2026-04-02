import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";
import { updateSongVersionSchema } from "$lib/schemas";

export const GET: RequestHandler = async ({ params }) => {
  const song = await prisma.song.findUnique({
    where: { id: params.id },
    include: {
      recommendedVersion: true,
      versions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!song) {
    throw error(404, "Song not found");
  }

  return json(song);
};

export const PUT: RequestHandler = async ({ params, request }) => {
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
  }

  const updatedSong = await prisma.song.findUnique({
    where: { id: params.id },
    include: {
      recommendedVersion: true,
      versions: { orderBy: { createdAt: "desc" } },
    },
  });

  return json(updatedSong);
};

export const DELETE: RequestHandler = async ({ params }) => {
  const song = await prisma.song.findUnique({ where: { id: params.id } });
  if (!song) {
    throw error(404, "Song not found");
  }

  await prisma.song.update({
    where: { id: params.id },
    data: { isArchived: true },
  });

  return json({ success: true });
};
