import { handle as authHandle } from "$lib/server/auth";
import { redirect, type Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";

const PUBLIC_PATHS = new Set([
  "/forgot-password",
  "/login",
  "/reset-password",
  "/setup",
]);
const PUBLIC_PATH_PREFIXES = ["/api/auth", "/api/invites/verify", "/signup"];

const enforceActiveUser: Handle = async ({ event, resolve }) => {
  const session = await event.locals.auth();
  const isActive = session?.user?.isActive ?? true;

  if (!session?.user || isActive) {
    return resolve(event);
  }

  const { pathname } = event.url;
  const isPublicPath =
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPublicPath) {
    return resolve(event);
  }

  if (pathname.startsWith("/api/")) {
    return new Response("Account is deactivated", { status: 403 });
  }

  throw redirect(303, "/login?deactivated=1");
};

export const handle = sequence(authHandle, enforceActiveUser);
