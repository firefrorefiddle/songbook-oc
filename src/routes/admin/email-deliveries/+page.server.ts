import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

import {
  getAdminEmailDeliveriesOverview,
  normaliseAdminEmailDeliveryFilters,
} from "$lib/server/adminEmailDeliveries";
import { getEmailTransportConfig } from "$lib/server/email";
import { prisma } from "$lib/server/prisma";
import type { EmailTransportConfig } from "$lib/server/email";

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.auth();
  if (!session?.user) {
    throw redirect(302, "/login");
  }

  if (session.user.role !== "ADMIN") {
    throw redirect(302, "/songs");
  }

  const overview = await getAdminEmailDeliveriesOverview(
    prisma,
    normaliseAdminEmailDeliveryFilters(url),
  );

  return {
    filters: overview.filters,
    deliveries: overview.deliveries,
    summary: overview.summary,
    transportConfig: getEmailTransportConfig() as EmailTransportConfig,
  };
};
