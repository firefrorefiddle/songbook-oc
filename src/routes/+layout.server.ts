import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  const session = await locals.auth();
  const role = session?.user ? (session.user as { role: string }).role : null;
  return {
    session: session?.user
      ? { user: { id: session.user.id as string, role } }
      : null,
  };
};
