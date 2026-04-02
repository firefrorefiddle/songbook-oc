import type { PageServerLoad, Actions } from "./$types";
import { prisma } from "$lib/server/prisma";
import { fail } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ params }) => {
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
    throw new Error("Song not found");
  }

  return { song };
};

export const actions: Actions = {
  update: async ({ params, request }) => {
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const author = formData.get("author") as string;
    const content = formData.get("content") as string;

    if (!title?.trim()) {
      return fail(400, { error: "Title is required" });
    }
    if (!content?.trim()) {
      return fail(400, { error: "Content is required" });
    }

    const metadata: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("meta_")) {
        const metaKey = key.slice(5);
        if (metaKey && value && typeof value === "string" && value.trim()) {
          metadata[metaKey] = value.trim();
        }
      }
    }

    await prisma.songVersion.create({
      data: {
        songId: params.id,
        title: title.trim(),
        author: author?.trim() || null,
        content: content.trim(),
        metadata: JSON.stringify(metadata),
      },
    });

    return { success: true };
  },

  setRecommended: async ({ params, request }) => {
    const formData = await request.formData();
    const versionId = formData.get("versionId") as string;

    if (!versionId) {
      return fail(400, { error: "Version ID is required" });
    }

    const version = await prisma.songVersion.findFirst({
      where: {
        id: versionId,
        songId: params.id,
      },
    });

    if (!version) {
      return fail(404, { error: "Version not found" });
    }

    await prisma.song.update({
      where: { id: params.id },
      data: { recommendedVersionId: versionId },
    });

    return { success: true };
  },

  clearRecommended: async ({ params }) => {
    const latestVersion = await prisma.songVersion.findFirst({
      where: { songId: params.id },
      orderBy: { createdAt: "desc" },
    });

    await prisma.song.update({
      where: { id: params.id },
      data: { recommendedVersionId: latestVersion?.id ?? null },
    });

    return { success: true };
  },

  fork: async ({ params, request }) => {
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const author = formData.get("author") as string;
    const content = formData.get("content") as string;

    if (!title?.trim()) {
      return fail(400, { error: "Title is required" });
    }
    if (!content?.trim()) {
      return fail(400, { error: "Content is required" });
    }

    const metadata: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("meta_")) {
        const metaKey = key.slice(5);
        if (metaKey && value && typeof value === "string" && value.trim()) {
          metadata[metaKey] = value.trim();
        }
      }
    }

    await prisma.songVersion.create({
      data: {
        songId: params.id,
        title: title.trim(),
        author: author?.trim() || null,
        content: content.trim(),
        metadata: JSON.stringify(metadata),
      },
    });

    return { success: true, forked: true };
  },

  deleteVersion: async ({ params, request }) => {
    const formData = await request.formData();
    const versionId = formData.get("versionId") as string;

    if (!versionId) {
      return fail(400, { error: "Version ID is required" });
    }

    const song = await prisma.song.findUnique({
      where: { id: params.id },
      include: { versions: { orderBy: { createdAt: "desc" } } },
    });

    if (!song) {
      return fail(404, { error: "Song not found" });
    }

    const versionIndex = song.versions.findIndex((v) => v.id === versionId);
    if (versionIndex === -1) {
      return fail(404, { error: "Version not found" });
    }

    if (versionIndex === 0) {
      return fail(400, { error: "Cannot delete the current version" });
    }

    await prisma.$transaction(async (tx) => {
      const songRecord = await tx.song.findUnique({
        where: { id: params.id },
        select: { recommendedVersionId: true },
      });

      if (songRecord?.recommendedVersionId === versionId) {
        await tx.song.update({
          where: { id: params.id },
          data: { recommendedVersionId: null },
        });
      }

      await tx.songVersion.delete({
        where: { id: versionId },
      });
    });

    return { success: true };
  },
};
