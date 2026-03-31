import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";
import bcrypt from "bcryptjs";

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { token, name, password } = body;

  if (!token) {
    throw error(400, "Invite token is required");
  }

  if (!name?.trim()) {
    throw error(400, "Name is required");
  }

  if (!password || password.length < 8) {
    throw error(400, "Password must be at least 8 characters");
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

  if (!invite.emailVerifiedAt) {
    throw error(400, "Please verify your email first");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: invite.email,
      name: name.trim(),
      passwordHash,
      role: invite.role,
    },
  });

  await prisma.invite.update({
    where: { id: invite.id },
    data: { usedAt: new Date(), userId: user.id },
  });

  return json(
    {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    },
    { status: 201 },
  );
};
