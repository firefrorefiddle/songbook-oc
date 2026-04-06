import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";
import { createSongbookSchema } from "$lib/schemas";
import { logActivity } from "$lib/server/activityLog";
import {
  buildSongbookListWhere,
  findSongbookIdsMatchingLatestVersionTaxonomy,
} from "$lib/server/songbookListQuery";

export const GET: RequestHandler = async ({ url, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw error(401, "Unauthorized");

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

  const songbooks = await prisma.songbook.findMany({
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
