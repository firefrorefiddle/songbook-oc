import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.auth();
  // Redirect already-logged-in users away from the login page
  if (session?.user && session.user.isActive !== false) {
    throw redirect(302, "/songs");
  }

  return {
    deactivated: url.searchParams.get("deactivated") === "1",
    reset: url.searchParams.get("reset") === "1",
    setup: url.searchParams.get("setup") === "1",
  };
};
