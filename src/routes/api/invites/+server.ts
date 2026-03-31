import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";
import { randomBytes } from "crypto";

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw error(401, "Unauthorized");
  const role = (session.user as { role: string }).role;
  if (role !== "ADMIN") throw error(403, "Forbidden");

  const invites = await prisma.invite.findMany({
    where: { usedAt: null },
    orderBy: { expiresAt: "desc" },
    include: { sentBy: { select: { name: true, email: true } } },
  });

  return json(invites);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw error(401, "Unauthorized");
  const userRole = (session.user as { role: string }).role;
  if (userRole !== "ADMIN") throw error(403, "Forbidden");

  const body = await request.json();
  const { email, role: inviteRole = "USER" } = body;

  if (!email?.trim()) {
    throw error(400, "Email is required");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existingUser) {
    throw error(400, "A user with this email already exists");
  }

  const existingInvite = await prisma.invite.findFirst({
    where: {
      email: email.toLowerCase(),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (existingInvite) {
    throw error(400, "An active invite already exists for this email");
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invite = await prisma.invite.create({
    data: {
      email: email.toLowerCase(),
      token,
      role: inviteRole as "USER" | "ADMIN",
      expiresAt,
      sentById: session.user.id!,
    },
  });

  const signupUrl = `/signup?token=${token}&email=${encodeURIComponent(email)}`;

  return json({ invite, signupUrl }, { status: 201 });
};
