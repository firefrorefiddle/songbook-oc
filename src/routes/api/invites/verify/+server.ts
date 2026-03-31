import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { token } = body;

  if (!token) {
    throw error(400, "Token is required");
  }

  const invite = await prisma.invite.findUnique({ where: { token } });

  if (!invite) {
    throw error(404, "Invalid invite token");
  }

  if (invite.usedAt) {
    throw error(400, "This invite has already been used");
  }

  if (invite.expiresAt < new Date()) {
    throw error(400, "This invite has expired");
  }

  if (invite.emailVerifiedAt) {
    throw error(400, "Email already verified");
  }

  await prisma.invite.update({
    where: { id: invite.id },
    data: { emailVerifiedAt: new Date() },
  });

  return json({ success: true, message: "Email verified successfully" });
};
