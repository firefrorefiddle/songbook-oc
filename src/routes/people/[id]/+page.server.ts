import type { PageServerLoad } from "./$types";
import { prisma } from "$lib/server/prisma";
import { error, redirect } from "@sveltejs/kit";
import { getUserDirectoryRowById } from "$lib/server/userDirectory";

export const load: PageServerLoad = async ({ params, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw redirect(302, "/login");

  const profile = await getUserDirectoryRowById(
    prisma,
    session.user.id as string,
    params.id,
  );

  if (!profile) {
    throw error(404, "User not found");
  }

  return { profile };
};
