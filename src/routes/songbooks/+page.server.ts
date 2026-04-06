import type { PageServerLoad, Actions } from "./$types";
import { prisma } from "$lib/server/prisma";
import {
  buildSongbookListWhere,
  findSongbookIdsMatchingLatestVersionTaxonomy,
} from "$lib/server/songbookListQuery";
import {
  songCategoryFilterOptionsWhere,
  songTagFilterOptionsWhere,
} from "$lib/server/songListQuery";
import { fail, redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ url, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw redirect(302, "/login");

  const search = url.searchParams.get("search") || "";
  const includeArchived = url.searchParams.get("includeArchived") === "true";
  const tagId = url.searchParams.get("tag")?.trim() || null;
  const categoryId = url.searchParams.get("category")?.trim() || null;
  const userId = session.user.id;

  const taxonomySongbookIds =
    tagId || categoryId
      ? await findSongbookIdsMatchingLatestVersionTaxonomy(prisma, {
          tagId,
          categoryId,
        })
      : null;

  const [songbooks, tagOptions, categoryOptions] = await Promise.all([
    prisma.songbook.findMany({
      where: buildSongbookListWhere({
        userId,
        includeArchived,
        search,
        taxonomySongbookIds,
      }),
      include: {
        versions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            songs: {
              include: {
                songVersion: true,
              },
            },
          },
        },
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
    songbooks,
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
    const description = formData.get("description") as string;

    if (!title?.trim()) {
      return fail(400, {
        error: "Title is required",
        fields: { title, description },
      });
    }

    await prisma.songbook.create({
      data: {
        ownerId: session.user.id!,
        versions: {
          create: {
            title: title.trim(),
            description: description?.trim() || null,
          },
        },
      },
    });

    return { success: true };
  },

  delete: async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user) throw redirect(302, "/login");

    const formData = await request.formData();
    const id = formData.get("id") as string;

    await prisma.songbook.update({
      where: { id },
      data: { isArchived: true },
    });

    return { success: true };
  },
};
