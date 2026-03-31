import type { PageServerLoad, Actions } from "./$types";
import { prisma } from "$lib/server/prisma";
import { fail, redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user) {
    throw redirect(302, "/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id as string },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      username: true,
      role: true,
    },
  });

  return {
    user: user
      ? {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          role: user.role,
        }
      : null,
  };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user) {
      throw redirect(302, "/login");
    }

    const formData = await request.formData();
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const username = formData.get("username") as string;

    const fields = { firstName, lastName, username };

    if (!firstName?.trim()) {
      return fail(400, { error: "First name is required", fields });
    }
    if (!lastName?.trim()) {
      return fail(400, { error: "Last name is required", fields });
    }
    if (!username?.trim()) {
      return fail(400, { error: "Username is required", fields });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        username: username.trim(),
        NOT: { id: session.user.id as string },
      },
    });
    if (existingUser) {
      return fail(400, { error: "Username is already taken", fields });
    }

    await prisma.user.update({
      where: { id: session.user.id as string },
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
      } as any,
    });

    return { success: true };
  },
};
