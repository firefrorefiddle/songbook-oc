import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";
import { createSongVersionSchema } from "$lib/schemas";
import { logActivity } from "$lib/server/activityLog";
import { buildSongCreationWarnings } from "$lib/server/songDuplicateDetection";
import {
  enforceSongPdfPipelineOrThrow,
  normalizedSongVersionWritePayload,
} from "$lib/server/songPdfPipelineGuard";

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
    { excludeSongId: params.id },
  );

  const songVersion = await prisma.songVersion.create({
    data: {
      songId: params.id,
      title: normalized.title,
      author: normalized.author,
      content: normalized.content,
      metadata: normalized.metadata,
    },
  });

  await logActivity({
    actorId: session.user.id!,
    action: "SONG_VERSION_CREATED",
    resourceType: "SONG",
    resourceId: params.id,
    metadata: { title: normalized.title },
  });

  return json({ songVersion, warnings }, { status: 201 });
};
