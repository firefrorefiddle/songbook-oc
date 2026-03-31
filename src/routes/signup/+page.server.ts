import type { PageServerLoad } from "./$types";
import { prisma } from "$lib/server/prisma";
import { EMAIL_VERIFICATION } from "$env/static/private";

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
  const requireVerification = EMAIL_VERIFICATION === "true";

  // If email verification is disabled, skip directly to signup
  if (!requireVerification) {
    return { step: "signup", token, email: displayEmail };
  }

  // Otherwise require email verification
  if (!invite.emailVerifiedAt) {
    return { step: "verify", token, email: displayEmail };
  }

  return { step: "signup", token, email: displayEmail };
};
