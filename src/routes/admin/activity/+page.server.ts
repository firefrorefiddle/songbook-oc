import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

import {
  getAdminActivityOverview,
  normaliseAdminActivityFilters,
} from "$lib/server/adminActivityLog";
import { prisma } from "$lib/server/prisma";

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.auth();
  if (!session?.user) {
    throw redirect(302, "/login");
  }

  if (session.user.role !== "ADMIN") {
    throw redirect(302, "/songs");
  }

  return getAdminActivityOverview(prisma, normaliseAdminActivityFilters(url));
};
