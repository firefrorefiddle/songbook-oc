import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.auth();
  // Redirect already-logged-in users away from the login page
  if (session?.user) {
    throw redirect(302, "/songs");
  }

  return {
    setup: url.searchParams.get("setup") === "1",
  };
};
