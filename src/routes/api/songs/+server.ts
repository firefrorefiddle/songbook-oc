import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";
import { createSongSchema } from "$lib/schemas";
import { logActivity } from "$lib/server/activityLog";
import { buildSongListWhere } from "$lib/server/songListQuery";
import { buildSongCreationWarnings } from "$lib/server/songDuplicateDetection";
import {
  enforceSongPdfPipelineOrThrow,
  normalizedSongVersionWritePayload,
} from "$lib/server/songPdfPipelineGuard";

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
  const meta = metadata ?? {};

  enforceSongPdfPipelineOrThrow({
    title,
    author: author ?? null,
    content,
    metadata: meta,
  });

  const normalized = normalizedSongVersionWritePayload({
    title,
    author: author ?? null,
    content,
    metadata: meta,
  });

  const warnings = await buildSongCreationWarnings(
    prisma,
    session.user.id!,
    {
      title: normalized.title,
      author: normalized.author,
      metadata: JSON.parse(normalized.metadata) as Record<string, string>,
    },
  );

  const song = await prisma.song.create({
    data: {
      ownerId: session.user.id!,
      versions: {
        create: {
          title: normalized.title,
          author: normalized.author,
          content: normalized.content,
          metadata: normalized.metadata,
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

  await logActivity({
    actorId: session.user.id!,
    action: "SONG_CREATED",
    resourceType: "SONG",
    resourceId: song.id,
    metadata: { title: song.versions[0]?.title },
  });

  return json({ song, warnings }, { status: 201 });
};
