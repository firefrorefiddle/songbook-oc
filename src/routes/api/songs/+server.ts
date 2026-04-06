import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";
import { createSongSchema } from "$lib/schemas";
import { buildSongListWhere } from "$lib/server/songListQuery";

export const GET: RequestHandler = async ({ url, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw error(401, "Unauthorized");

  const search = url.searchParams.get("search") || "";
  const includeArchived = url.searchParams.get("includeArchived") === "true";
  const tagId = url.searchParams.get("tag")?.trim() || null;
  const categoryId = url.searchParams.get("category")?.trim() || null;
  const userId = session.user.id;

  const songs = await prisma.song.findMany({
    where: buildSongListWhere({
      userId,
      includeArchived,
      search,
      tagId,
      categoryId,
    }),
    include: {
      recommendedVersion: true,
      versions: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      tags: { include: { tag: true } },
      categories: { include: { category: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return json(songs);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw error(401, "Unauthorized");

  const body = await request.json();
  const parsed = createSongSchema.safeParse(body);

  if (!parsed.success) {
    throw error(400, parsed.error.errors[0].message);
  }

  const { title, author, content, metadata } = parsed.data;

  const song = await prisma.song.create({
    data: {
      ownerId: session.user.id!,
      versions: {
        create: {
          title,
          author,
          content,
          metadata: JSON.stringify(metadata || {}),
        },
      },
    },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (song.versions[0]) {
    await prisma.song.update({
      where: { id: song.id },
      data: { recommendedVersionId: song.versions[0].id },
    });
  }

  return json(song, { status: 201 });
};
