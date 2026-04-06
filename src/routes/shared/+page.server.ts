import type { PageServerLoad } from "./$types";
import { prisma } from "$lib/server/prisma";
import { redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ url, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw redirect(302, "/login");

  const userId = session.user.id;
  const filter = url.searchParams.get("filter") || "all";

  const songs = await prisma.song.findMany({
    where: {
      isArchived: false,
      collaborations: { some: { userId } },
      NOT: { ownerId: userId },
    },
    include: {
      recommendedVersion: true,
      versions: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      owner: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      collaborations: {
        where: { userId },
        select: { role: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const songbooks = await prisma.songbook.findMany({
    where: {
      isArchived: false,
      collaborations: { some: { userId } },
      NOT: { ownerId: userId },
    },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      owner: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      collaborations: {
        where: { userId },
        select: { role: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return {
    songs,
    songbooks,
    filter,
  };
};
