import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";
import { logActivity } from "$lib/server/activityLog";
import {
  enforceSongPdfPipelineOrThrow,
  normalizedSongVersionWritePayload,
  parseMetadataRecord,
} from "$lib/server/songPdfPipelineGuard";
import { buildSongCreationWarnings } from "$lib/server/songDuplicateDetection";

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

  const baseVersion = originalSong.versions[0];
  if (!baseVersion) {
    throw error(400, "Song has no versions to fork");
  }

  const body = await request.json();
  const { title, author, content, metadata } = body;
  const effectiveTitle = (title ?? baseVersion.title).trim();
  const effectiveAuthor = author !== undefined ? author : baseVersion.author;
  const effectiveContent = content ?? baseVersion.content;
  const effectiveMetadata =
    metadata !== undefined
      ? (metadata as Record<string, string>)
      : parseMetadataRecord(baseVersion.metadata);

  enforceSongPdfPipelineOrThrow({
    title: effectiveTitle,
    author: effectiveAuthor,
    content: effectiveContent,
    metadata: effectiveMetadata,
  });

  const normalized = normalizedSongVersionWritePayload({
    title: effectiveTitle,
    author: effectiveAuthor,
    content: effectiveContent,
    metadata: effectiveMetadata,
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

  const forkedSong = await prisma.song.create({
    data: {
      ownerId: session.user.id!,
      forkedFromId: originalSong.id,
      versions: {
        create: {
          title: normalized.title,
          author: normalized.author,
          content: normalized.content,
          metadata: normalized.metadata,
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

  await logActivity({
    actorId: session.user.id!,
    action: "SONG_FORKED",
    resourceType: "SONG",
    resourceId: forkedSong.id,
    sourceResourceId: originalSong.id,
    sourceResourceType: "SONG",
    metadata: { title: forkedSong.versions[0]?.title },
  });

  return json({ song: forkedSong, warnings }, { status: 201 });
};
