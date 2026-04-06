import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";
import { materialiseInviteCollaborations } from "$lib/server/inviteCollaborations";
import { logActivity } from "$lib/server/activityLog";
import bcrypt from "bcryptjs";
import { EMAIL_VERIFICATION } from "$env/static/private";

type UserCreateInput = Parameters<typeof prisma.user.create>[0]["data"];

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { token, firstName, lastName, username, password } = body;

  if (!token) {
    throw error(400, "Invite token is required");
  }

  if (!firstName?.trim()) {
    throw error(400, "First name is required");
  }

  if (!lastName?.trim()) {
    throw error(400, "Last name is required");
  }

  if (!username?.trim()) {
    throw error(400, "Username is required");
  }

  if (!password || password.length < 8) {
    throw error(400, "Password must be at least 8 characters");
  }

  const existingUsername = await prisma.user.findUnique({
    where: { username: username.trim() } as any,
  });
  if (existingUsername) {
    throw error(400, "Username is already taken");
  }

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { inviteCollaborations: true },
  });

  if (!invite) {
    throw error(404, "Invalid invite token");
  }

  if (invite.usedAt) {
    throw error(400, "This invite has already been used");
  }

  if (invite.expiresAt < new Date()) {
    throw error(400, "This invite has expired");
  }

  const requireVerification = EMAIL_VERIFICATION === "true";
  if (requireVerification && !invite.emailVerifiedAt) {
    throw error(400, "Please verify your email first");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: invite.email,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username.trim(),
      passwordHash,
      role: invite.role,
    } as any,
  });

  await prisma.invite.update({
    where: { id: invite.id },
    data: { usedAt: new Date(), userId: user.id },
  });

  // Materialise any pending collaboration grants attached to this invite.
  // Missing or archived resources are silently skipped inside the helper.
  await materialiseInviteCollaborations(
    prisma,
    user.id,
    invite.inviteCollaborations,
  );

  await logActivity({
    actorId: user.id,
    action: "INVITE_ACCEPTED",
    resourceType: "USER",
    resourceId: user.id,
    sourceResourceId: invite.id,
    sourceResourceType: "INVITE",
    metadata: { email: user.email },
  });

  return json(
    {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        username: user.username ?? null,
        role: user.role,
      },
    },
    { status: 201 },
  );
};
