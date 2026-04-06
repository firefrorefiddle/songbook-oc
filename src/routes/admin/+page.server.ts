import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user) {
    throw redirect(302, "/login");
  }

  if (session.user.role !== "ADMIN") {
    throw redirect(302, "/songs");
  }

  throw redirect(302, "/admin/users");
};
