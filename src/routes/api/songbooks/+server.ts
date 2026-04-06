import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";
import { createSongbookSchema } from "$lib/schemas";
import { logActivity } from "$lib/server/activityLog";

export const GET: RequestHandler = async ({ url, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw error(401, "Unauthorized");

  const search = url.searchParams.get("search") || "";
  const includeArchived = url.searchParams.get("includeArchived") === "true";
  const userId = session.user.id;

  const songbooks = await prisma.songbook.findMany({
    where: {
      isArchived: includeArchived ? undefined : false,
      // Show songbooks the user owns, collaborates on, or are public
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

  return json(songbooks);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw error(401, "Unauthorized");

  const body = await request.json();
  const parsed = createSongbookSchema.safeParse(body);

  if (!parsed.success) {
    throw error(400, parsed.error.errors[0].message);
  }

  const { title, description } = parsed.data;

  const songbook = await prisma.songbook.create({
    data: {
      ownerId: session.user.id!,
      versions: {
        create: {
          title,
          description,
        },
      },
    },
    include: {
      versions: true,
    },
  });

  await logActivity({
    actorId: session.user.id!,
    action: "SONGBOOK_CREATED",
    resourceType: "SONGBOOK",
    resourceId: songbook.id,
    metadata: { title },
  });

  return json(songbook, { status: 201 });
};
