import type { PageServerLoad } from "./$types";
import { parseInitialSlideIndex } from "$lib/presentation/slideNavigation";
import { prisma } from "$lib/server/prisma";
import { error, redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ params, url, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw redirect(302, "/login");

  const userId = session.user.id;
  const versionIdParam = url.searchParams.get("version")?.trim() || null;

  const songbook = await prisma.songbook.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      ownerId: true,
      isPublic: true,
      collaborations: {
        where: { userId },
        take: 1,
        select: { id: true },
      },
    },
  });

  if (!songbook) {
    throw error(404, "Songbook not found");
  }

  const canView =
    songbook.ownerId === userId ||
    songbook.isPublic ||
    songbook.collaborations.length > 0;
  if (!canView) {
    throw error(403, "You do not have access to this songbook");
  }

  const version = await prisma.songbookVersion.findFirst({
    where: {
      songbookId: params.id,
      ...(versionIdParam ? { id: versionIdParam } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      songs: {
        orderBy: { order: "asc" },
        include: {
          songVersion: {
            select: {
              id: true,
              title: true,
              author: true,
              content: true,
              song: { select: { id: true } },
            },
          },
        },
      },
    },
  });

  if (versionIdParam && !version) {
    throw error(404, "Songbook version not found");
  }

  const versionsSummary = await prisma.songbookVersion.findMany({
    where: { songbookId: params.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      _count: { select: { songs: true } },
    },
  });

  const slides =
    version?.songs.map((row) => ({
      songVersionId: row.songVersion.id,
      songId: row.songVersion.song.id,
      title: row.songVersion.title,
      author: row.songVersion.author,
      content: row.songVersion.content,
    })) ?? [];

  const initialSlideIndex = parseInitialSlideIndex(
    url.searchParams.get("slide"),
    slides.length,
  );

  return {
    songbookId: songbook.id,
    activeVersion: version
      ? {
          id: version.id,
          title: version.title,
          description: version.description,
        }
      : null,
    versionsSummary,
    slides,
    initialSlideIndex,
  };
};
