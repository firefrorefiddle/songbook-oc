import type { PageServerLoad, Actions } from "./$types";
import { prisma } from "$lib/server/prisma";
import { fail, redirect } from "@sveltejs/kit";
import {
  getSongCollaborators,
  getOwnerInfo,
  getActiveUsers,
  addSongCollaborator,
  removeSongCollaborator,
  transferSongOwnership,
} from "$lib/server/collaborations";

export const load: PageServerLoad = async ({ params, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw redirect(302, "/login");

  const currentUserId = session.user.id;

  const song = await prisma.song.findUnique({
    where: { id: params.id },
    include: {
      forkedFrom: {
        include: {
          versions: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      recommendedVersion: true,
      versions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!song) {
    throw new Error("Song not found");
  }

  const [owner, collaborators] = await Promise.all([
    getOwnerInfo(prisma, song.ownerId),
    getSongCollaborators(prisma, params.id),
  ]);

  const isOwner = song.ownerId === currentUserId;

  return {
    song,
    owner,
    collaborators,
    isOwner,
    canManage: isOwner,
    currentUserId,
  };
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

  addCollaborator: async ({ params, request, locals }) => {
    const session = await locals.auth();
    if (!session?.user) throw redirect(302, "/login");

    const song = await prisma.song.findUnique({
      where: { id: params.id },
      select: { ownerId: true },
    });

    if (!song) {
      return fail(404, { error: "Song not found" });
    }

    if (song.ownerId !== session.user.id) {
      return fail(403, { error: "Only the owner can add collaborators" });
    }

    const formData = await request.formData();
    const userId = formData.get("userId") as string;
    const role = (formData.get("role") as "EDITOR" | "ADMIN") || "EDITOR";

    if (!userId) {
      return fail(400, { error: "User is required" });
    }

    try {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true },
      });
      if (!targetUser) {
        return fail(400, { error: "User not found" });
      }
      const targetUserDisplayName =
        [targetUser.firstName, targetUser.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() || targetUser.email;

      await addSongCollaborator(prisma, {
        actorId: session.user.id,
        songId: params.id,
        targetUserId: userId,
        targetUserDisplayName,
        role,
      });
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not add collaborator";
      return fail(400, { error: message });
    }
  },

  removeCollaborator: async ({ params, request, locals }) => {
    const session = await locals.auth();
    if (!session?.user) throw redirect(302, "/login");

    const song = await prisma.song.findUnique({
      where: { id: params.id },
      select: { ownerId: true },
    });

    if (!song) {
      return fail(404, { error: "Song not found" });
    }

    if (song.ownerId !== session.user.id) {
      return fail(403, { error: "Only the owner can remove collaborators" });
    }

    const formData = await request.formData();
    const userId = formData.get("userId") as string;

    if (!userId) {
      return fail(400, { error: "User is required" });
    }

    try {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true },
      });
      if (!targetUser) {
        return fail(400, { error: "User not found" });
      }
      const targetUserDisplayName =
        [targetUser.firstName, targetUser.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() || targetUser.email;

      await removeSongCollaborator(prisma, {
        actorId: session.user.id,
        songId: params.id,
        targetUserId: userId,
        targetUserDisplayName,
      });
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not remove collaborator";
      return fail(400, { error: message });
    }
  },

  transferOwnership: async ({ params, request, locals }) => {
    const session = await locals.auth();
    if (!session?.user) throw redirect(302, "/login");

    const song = await prisma.song.findUnique({
      where: { id: params.id },
      select: { ownerId: true },
    });

    if (!song) {
      return fail(404, { error: "Song not found" });
    }

    if (song.ownerId !== session.user.id) {
      return fail(403, { error: "Only the owner can transfer ownership" });
    }

    const formData = await request.formData();
    const newOwnerId = formData.get("newOwnerId") as string;

    if (!newOwnerId) {
      return fail(400, { error: "New owner is required" });
    }

    try {
      const currentOwner = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { firstName: true, lastName: true, email: true },
      });
      const newOwner = await prisma.user.findUnique({
        where: { id: newOwnerId },
        select: { firstName: true, lastName: true, email: true },
      });
      if (!currentOwner || !newOwner) {
        return fail(400, { error: "User not found" });
      }
      const currentOwnerDisplayName =
        [currentOwner.firstName, currentOwner.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() || currentOwner.email;
      const newOwnerDisplayName =
        [newOwner.firstName, newOwner.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() || newOwner.email;

      await transferSongOwnership(prisma, {
        actorId: session.user.id,
        songId: params.id,
        currentOwnerId: session.user.id,
        currentOwnerDisplayName,
        newOwnerId,
        newOwnerDisplayName,
      });
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not transfer ownership";
      return fail(400, { error: message });
    }
  },

  loadUsers: async ({ locals }) => {
    const session = await locals.auth();
    if (!session?.user) throw redirect(302, "/login");

    const users = await getActiveUsers(prisma);
    return { users };
  },
};
