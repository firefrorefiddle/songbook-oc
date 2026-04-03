import type { PageServerLoad } from "./$types";
import { prisma } from "$lib/server/prisma";
import { redirect } from "@sveltejs/kit";
import { searchUsers, getSharedWithMe } from "$lib/server/userDirectory";

export const load: PageServerLoad = async ({ url, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw redirect(302, "/login");

  const currentUserId = session.user.id;
  const search = url.searchParams.get("search") || "";

  const [users, sharedContent] = await Promise.all([
    searchUsers(prisma, currentUserId, search),
    getSharedWithMe(prisma, currentUserId),
  ]);

  return {
    users,
    sharedContent,
    search,
  };
};
