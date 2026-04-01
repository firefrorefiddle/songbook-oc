import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/server/prisma";
import {
  buildInviteSignupUrl,
  resolvePublicBaseUrl,
  sendInviteEmail,
} from "$lib/server/email";
import { randomBytes } from "crypto";
import { EMAIL_VERIFICATION } from "$env/static/private";

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

export const POST: RequestHandler = async ({ request, locals, url }) => {
  const session = await locals.auth();
  if (!session?.user) throw error(401, "Unauthorized");
  const userRole = (session.user as { role: string }).role;
  if (userRole !== "ADMIN") throw error(403, "Forbidden");

  const body = await request.json();
  const {
    email,
    role: inviteRole = "USER",
    // Optional: [{ ownerId: string, resourceType: "song" | "songbook" }]
    collaborations = [],
  } = body;

  if (!email?.trim()) {
    throw error(400, "Email is required");
  }

  // Validate collaboration entries
  for (const c of collaborations) {
    if (!c.ownerId) throw error(400, "Each collaboration must have an ownerId");
    if (c.resourceType !== "song" && c.resourceType !== "songbook") {
      throw error(400, `Invalid resourceType: ${c.resourceType}`);
    }
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

  if (collaborations.length > 0) {
    const ownerIdSet = Array.from(
      new Set(collaborations.map((c: { ownerId: string }) => c.ownerId)),
    );
    const foundOwners = await prisma.user.findMany({
      where: { id: { in: ownerIdSet as string[] } },
      select: { id: true },
    });
    if (foundOwners.length !== ownerIdSet.length) {
      throw error(400, "One or more specified owners do not exist");
    }
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
      inviteCollaborations: {
        create: collaborations.map(
          (c: { ownerId: string; resourceType: string }) => ({
            ownerId: c.ownerId,
            resourceType: c.resourceType,
          }),
        ),
      },
    },
  });

  const signupUrl = buildInviteSignupUrl(
    resolvePublicBaseUrl(url.origin),
    token,
    email,
  );
  const emailDelivery = await sendInviteEmail({
    inviteId: invite.id,
    toEmail: invite.email,
    signupUrl,
    expiresAt: invite.expiresAt,
    invitedByName: null,
    requireEmailVerification: EMAIL_VERIFICATION === "true",
  });

  return json({ invite, signupUrl, emailDelivery }, { status: 201 });
};
