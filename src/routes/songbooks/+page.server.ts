import type { PageServerLoad, Actions } from "./$types";
import { prisma } from "$lib/server/prisma";
import { fail, redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ url, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw redirect(302, "/login");

  const search = url.searchParams.get("search") || "";
  const includeArchived = url.searchParams.get("includeArchived") === "true";
  const userId = session.user.id;

  const songbooks = await prisma.songbook.findMany({
    where: {
      isArchived: includeArchived ? undefined : false,
      OR: [
        { ownerId: userId },
        { collaborations: { some: { userId } } },
        { isPublic: true },
      ],
      versions: search ? { some: { title: { contains: search } } } : undefined,
    },
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
  });

  return {
    songbooks,
    search,
    includeArchived,
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
