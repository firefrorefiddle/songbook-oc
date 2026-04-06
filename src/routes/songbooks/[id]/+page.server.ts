import type { PageServerLoad, Actions } from "./$types";
import { prisma } from "$lib/server/prisma";
import {
  buildSongListWhere,
  songCategoryFilterOptionsWhere,
  songTagFilterOptionsWhere,
} from "$lib/server/songListQuery";
import { error, fail, redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ params, url, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw redirect(302, "/login");

  const userId = session.user.id;
  const tagId = url.searchParams.get("tag")?.trim() || null;
  const categoryId = url.searchParams.get("category")?.trim() || null;

  const songbook = await prisma.songbook.findUnique({
    where: { id: params.id },
    include: {
      collaborations: {
        where: { userId },
        take: 1,
      },
      forkedFrom: {
        include: {
          versions: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      versions: {
        orderBy: { createdAt: "desc" },
        include: {
          songs: {
            include: {
              songVersion: {
                include: {
                  song: true,
                },
              },
            },
            orderBy: { order: "asc" },
          },
        },
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

  const [availableSongs, tagOptions, categoryOptions] = await Promise.all([
    prisma.song.findMany({
      where: buildSongListWhere({
        userId,
        includeArchived: false,
        search: "",
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
    }),
    prisma.songTag.findMany({
      where: songTagFilterOptionsWhere(userId, false),
      orderBy: { name: "asc" },
    }),
    prisma.songCategory.findMany({
      where: songCategoryFilterOptionsWhere(userId, false),
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    songbook,
    availableSongs,
    tagId,
    categoryId,
    tagOptions,
    categoryOptions,
  };
};

export const actions: Actions = {
  createVersion: async ({ params, request }) => {
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    if (!title?.trim()) {
      return fail(400, { error: "Title is required" });
    }

    await prisma.songbookVersion.create({
      data: {
        songbookId: params.id,
        title: title.trim(),
        description: description?.trim() || null,
      },
    });

    return { success: true };
  },

  addSong: async ({ params, request }) => {
    const formData = await request.formData();
    const songVersionIds = formData.getAll("songVersionIds") as string[];

    if (songVersionIds.length === 0) {
      return fail(400, { error: "Please select at least one song" });
    }

    const currentVersion = await prisma.songbookVersion.findFirst({
      where: { songbookId: params.id },
      orderBy: { createdAt: "desc" },
    });

    if (!currentVersion) {
      return fail(400, { error: "No version found" });
    }

    const existingSongVersionIds = await prisma.songbookSong.findMany({
      where: { songbookVersionId: currentVersion.id },
      select: { songVersionId: true },
    });
    const existingIds = new Set(
      existingSongVersionIds.map((s) => s.songVersionId),
    );

    const maxOrderResult = await prisma.songbookSong.aggregate({
      where: { songbookVersionId: currentVersion.id },
      _max: { order: true },
    });

    let order = (maxOrderResult._max.order ?? -1) + 1;
    const songsToCreate: {
      songbookVersionId: string;
      songVersionId: string;
      order: number;
    }[] = [];

    for (const songVersionId of songVersionIds) {
      if (!existingIds.has(songVersionId)) {
        songsToCreate.push({
          songbookVersionId: currentVersion.id,
          songVersionId,
          order: order++,
        });
      }
    }

    if (songsToCreate.length > 0) {
      await prisma.songbookSong.createMany({
        data: songsToCreate,
      });
    }

    return { success: true };
  },

  removeSong: async ({ params, request }) => {
    const formData = await request.formData();
    const songVersionId = formData.get("songVersionId") as string;

    const currentVersion = await prisma.songbookVersion.findFirst({
      where: { songbookId: params.id },
      orderBy: { createdAt: "desc" },
    });

    if (!currentVersion) {
      return fail(400, { error: "No version found" });
    }

    await prisma.songbookSong.deleteMany({
      where: {
        songbookVersionId: currentVersion.id,
        songVersionId,
      },
    });

    return { success: true };
  },

  reorderSongs: async ({ params, request }) => {
    const formData = await request.formData();
    const songVersionIds = formData.getAll("songVersionIds") as string[];

    if (songVersionIds.length === 0) {
      return fail(400, { error: "No songs to reorder" });
    }

    const currentVersion = await prisma.songbookVersion.findFirst({
      where: { songbookId: params.id },
      orderBy: { createdAt: "desc" },
    });

    if (!currentVersion) {
      return fail(400, { error: "No version found" });
    }

    for (let i = 0; i < songVersionIds.length; i++) {
      await prisma.songbookSong.updateMany({
        where: {
          songbookVersionId: currentVersion.id,
          songVersionId: songVersionIds[i],
        },
        data: { order: i },
      });
    }

    return { success: true };
  },

  updateSettings: async ({ params, request }) => {
    const formData = await request.formData();
    const mode = formData.get("mode") as "chorded" | "text-only" | "overhead";
    const fontSize = formData.get("fontSize") as
      | "small"
      | "medium"
      | "large"
      | "extra-large";
    const paperSize = formData.get("paperSize") as "a4" | "a5" | "letter";

    const outputSettings = JSON.stringify({
      mode: mode || "chorded",
      fontSize: fontSize || "medium",
      paperSize: paperSize || "a4",
    });

    await prisma.songbook.update({
      where: { id: params.id },
      data: { outputSettings },
    });

    return { success: true };
  },
};
