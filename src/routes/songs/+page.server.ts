import type { PageServerLoad, Actions } from "./$types";
import { prisma } from "$lib/server/prisma";
import { fail, redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ url, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw redirect(302, "/login");

  const search = url.searchParams.get("search") || "";
  const includeArchived = url.searchParams.get("includeArchived") === "true";
  const userId = session.user.id;

  const songs = await prisma.song.findMany({
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
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return {
    songs,
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
    const author = formData.get("author") as string;
    const content = formData.get("content") as string;
    const copyright = formData.get("copyright") as string;

    if (!title?.trim()) {
      return fail(400, {
        error: "Title is required",
        fields: { title, author, content, copyright },
      });
    }
    if (!content?.trim()) {
      return fail(400, {
        error: "Content is required",
        fields: { title, author, content, copyright },
      });
    }

    const metadata: Record<string, string> = {};
    if (copyright) metadata.copyright = copyright;

    await prisma.song.create({
      data: {
        ownerId: session.user.id!,
        versions: {
          create: {
            title: title.trim(),
            author: author?.trim() || null,
            content: content.trim(),
            metadata: JSON.stringify(metadata),
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

    await prisma.song.update({
      where: { id },
      data: { isArchived: true },
    });

    return { success: true };
  },
};
