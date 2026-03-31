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
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!name?.trim()) {
      return fail(400, { error: "Name is required", fields: { name, email } });
    }
    if (!email?.trim()) {
      return fail(400, { error: "Email is required", fields: { name, email } });
    }
    if (!password || password.length < 8) {
      return fail(400, {
        error: "Password must be at least 8 characters",
        fields: { name, email },
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        role: "ADMIN",
      },
    });

    throw redirect(302, "/login?setup=1");
  },
};
