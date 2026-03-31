import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { prisma } from "$lib/server/prisma";

export const load: PageServerLoad = async ({ url }) => {
  const token = url.searchParams.get("token");
  const email = url.searchParams.get("email");

  if (!token) {
    return { error: "Invite token is required", step: "invalid" };
  }

  const invite = await prisma.invite.findUnique({ where: { token } });

  if (!invite) {
    return { error: "Invalid invite token", step: "invalid" };
  }

  if (invite.usedAt) {
    return { error: "This invite has already been used", step: "invalid" };
  }

  if (invite.expiresAt < new Date()) {
    return { error: "This invite has expired", step: "invalid" };
  }

  const displayEmail = email || invite.email;

  if (!invite.emailVerifiedAt) {
    return { step: "verify", token, email: displayEmail };
  }

  return { step: "signup", token, email: displayEmail };
};
