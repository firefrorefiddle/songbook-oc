import type { PageServerLoad, Actions } from "./$types";
import { prisma } from "$lib/server/prisma";
import { fail, redirect } from "@sveltejs/kit";
import bcrypt from "bcryptjs";

// This page is only accessible when no users exist in the database.
// It creates the first admin user without requiring email verification.
export const load: PageServerLoad = async () => {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    throw redirect(302, "/login");
  }
  return {};
};

export const actions: Actions = {
  default: async ({ request }) => {
    // Verify again inside the action to prevent race conditions
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      throw redirect(302, "/login");
    }

    const formData = await request.formData();
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const username = formData.get("username") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const fields = { firstName, lastName, username, email };

    if (!firstName?.trim()) {
      return fail(400, { error: "First name is required", fields });
    }
    if (!lastName?.trim()) {
      return fail(400, { error: "Last name is required", fields });
    }
    if (!username?.trim()) {
      return fail(400, { error: "Username is required", fields });
    }
    if (!email?.trim()) {
      return fail(400, { error: "Email is required", fields });
    }
    if (!password || password.length < 8) {
      return fail(400, {
        error: "Password must be at least 8 characters",
        fields,
      });
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username: username.trim() } as any,
    });
    if (existingUsername) {
      return fail(400, { error: "Username is already taken", fields });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        role: "ADMIN",
      } as any,
    });

    throw redirect(302, "/login?setup=1");
  },
};
