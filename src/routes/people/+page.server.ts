import type { PageServerLoad } from "./$types";
import { prisma } from "$lib/server/prisma";
import { redirect } from "@sveltejs/kit";
import { searchUsers } from "$lib/server/userDirectory";

export const load: PageServerLoad = async ({ url, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw redirect(302, "/login");

  const currentUserId = session.user.id;
  const search = url.searchParams.get("search") || "";

  const users = await searchUsers(prisma, currentUserId, search);

  return {
    users,
    search,
  };
};
