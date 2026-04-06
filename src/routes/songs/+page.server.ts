import type { PageServerLoad, Actions } from "./$types";
import { prisma } from "$lib/server/prisma";
import {
  buildSongListWhere,
  songCategoryFilterOptionsWhere,
  songTagFilterOptionsWhere,
} from "$lib/server/songListQuery";
import { fail, redirect } from "@sveltejs/kit";
import {
  formatSongPdfPipelineIssues,
  validateSongPdfPipelineInput,
} from "$lib/utils/songPdfPipelineSafety";
import { normalizedSongVersionWritePayload } from "$lib/server/songPdfPipelineGuard";
import { buildSongCreationWarnings } from "$lib/server/songDuplicateDetection";

export const load: PageServerLoad = async ({ url, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw redirect(302, "/login");

  const search = url.searchParams.get("search") || "";
  const includeArchived = url.searchParams.get("includeArchived") === "true";
  const tagId = url.searchParams.get("tag")?.trim() || null;
  const categoryId = url.searchParams.get("category")?.trim() || null;
  const userId = session.user.id;

  const [songs, tagOptions, categoryOptions] = await Promise.all([
    prisma.song.findMany({
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
    }),
    prisma.songTag.findMany({
      where: songTagFilterOptionsWhere(userId, includeArchived),
      orderBy: { name: "asc" },
    }),
    prisma.songCategory.findMany({
      where: songCategoryFilterOptionsWhere(userId, includeArchived),
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    songs,
    search,
    includeArchived,
    tagId,
    categoryId,
    tagOptions,
    categoryOptions,
  };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user) throw redirect(302, "/login");

    const formData = await request.formData();
    const title = formData.get("title") as string;
    const author = formData.get("author") as string;
    const content = formData.get("content") as string;

    if (!title?.trim()) {
      return fail(400, {
        error: "Title is required",
        fields: { title, author, content },
      });
    }
    if (!content?.trim()) {
      return fail(400, {
        error: "Content is required",
        fields: { title, author, content },
      });
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

    const pipelineIssues = validateSongPdfPipelineInput({
      title: title.trim(),
      author: author?.trim() || null,
      content,
      metadata,
    });
    if (pipelineIssues.length > 0) {
      return fail(400, {
        error: formatSongPdfPipelineIssues(pipelineIssues),
        fields: { title, author, content },
      });
    }

    const normalized = normalizedSongVersionWritePayload({
      title: title.trim(),
      author: author?.trim() || null,
      content,
      metadata,
    });

    const warnings = await buildSongCreationWarnings(prisma, session.user.id!, {
      title: normalized.title,
      author: normalized.author,
      metadata: JSON.parse(normalized.metadata) as Record<string, string>,
    });

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

    return { success: true, warnings };
  },

  delete: async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user) throw redirect(302, "/login");

    const formData = await request.formData();
    const id = formData.get("id") as string;

    await prisma.song.update({
      where: { id },
      data: { isArchived: true },
    });

    return { success: true };
  },
};
