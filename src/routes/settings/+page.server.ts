import type { PageServerLoad, Actions } from "./$types";
import { prisma } from "$lib/server/prisma";
import {
  parsePublicBioInput,
  PUBLIC_BIO_MAX_LENGTH,
} from "$lib/server/publicProfile";
import { fail, redirect } from "@sveltejs/kit";
import bcrypt from "bcryptjs";

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
      publicBio: true,
      role: true,
      passwordHash: true,
    },
  });

  return {
    publicBioMaxLength: PUBLIC_BIO_MAX_LENGTH,
    user: user
      ? {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          publicBio: user.publicBio,
          role: user.role,
          hasPassword: !!user.passwordHash,
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
    const publicBioRaw = formData.get("publicBio");

    const fields = { firstName, lastName, username, publicBio: publicBioRaw as string };

    const bioParsed = parsePublicBioInput(publicBioRaw);
    if (!bioParsed.ok) {
      return fail(400, { error: bioParsed.error, fields });
    }

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
        publicBio: bioParsed.value,
      },
    });

    return { success: true };
  },

  changePassword: async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user) {
      throw redirect(302, "/login");
    }

    const formData = await request.formData();
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!currentPassword) {
      return fail(400, { passwordError: "Current password is required" });
    }
    if (!newPassword) {
      return fail(400, { passwordError: "New password is required" });
    }
    if (newPassword.length < 8) {
      return fail(400, {
        passwordError: "New password must be at least 8 characters",
      });
    }
    if (newPassword !== confirmPassword) {
      return fail(400, { passwordError: "New passwords do not match" });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id as string },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      return fail(400, {
        passwordError: "Cannot change password for accounts without a password",
      });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return fail(400, { passwordError: "Current password is incorrect" });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id as string },
      data: { passwordHash: newHash },
    });

    return { passwordSuccess: true };
  },
};
