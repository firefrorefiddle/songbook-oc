import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw error(401, "Unauthorized");

  const originalSong = await prisma.song.findUnique({
    where: { id: params.id },
    include: {
      versions: { orderBy: { createdAt: "desc" } },
      tags: true,
      categories: true,
    },
  });

  if (!originalSong) {
    throw error(404, "Song not found");
  }

  const body = await request.json();
  const { title, author, content, metadata } = body;

  const forkedSong = await prisma.song.create({
    data: {
      ownerId: session.user.id!,
      forkedFromId: originalSong.id,
      versions: {
        create: {
          title: title || originalSong.versions[0].title,
          author: author ?? originalSong.versions[0].author,
          content: content || originalSong.versions[0].content,
          metadata: JSON.stringify(metadata || {}),
        },
      },
      tags: {
        create: originalSong.tags.map((t) => ({
          tagId: t.tagId,
        })),
      },
      categories: {
        create: originalSong.categories.map((c) => ({
          categoryId: c.categoryId,
        })),
      },
    },
    include: {
      versions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (forkedSong.versions[0]) {
    await prisma.song.update({
      where: { id: forkedSong.id },
      data: { recommendedVersionId: forkedSong.versions[0].id },
    });
  }

  return json(forkedSong, { status: 201 });
};
