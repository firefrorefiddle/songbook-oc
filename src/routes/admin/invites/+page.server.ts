import type { PageServerLoad, Actions } from "./$types";
import { prisma } from "$lib/server/prisma";
import { redirect, fail } from "@sveltejs/kit";
import { randomBytes } from "crypto";

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw redirect(302, "/login");

  const role = (session.user as { role: string }).role;
  if (role !== "ADMIN") throw redirect(302, "/songs");

  const [invites, users] = await Promise.all([
    prisma.invite.findMany({
      orderBy: { expiresAt: "desc" },
      include: {
        sentBy: { select: { name: true, email: true } },
        inviteCollaborations: {
          include: { owner: { select: { id: true, name: true, email: true } } },
        },
      },
    }),
    // Load all users so the admin can pick whose content to share
    prisma.user.findMany({
      orderBy: { email: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  return { invites, users };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user) throw redirect(302, "/login");

    const role = (session.user as { role: string }).role;
    if (role !== "ADMIN") throw redirect(302, "/songs");

    const formData = await request.formData();
    const email = formData.get("email") as string;
    const userRole = (formData.get("role") as string) || "USER";

    // Collect collaboration entries: parallel arrays of ownerIds and resourceTypes
    const ownerIds = formData.getAll("collab_ownerId") as string[];
    const resourceTypes = formData.getAll("collab_resourceType") as string[];

    if (!email?.trim()) {
      return fail(400, { error: "Email is required" });
    }

    // Validate collaboration entries
    const collaborations: { ownerId: string; resourceType: string }[] = [];
    for (let i = 0; i < ownerIds.length; i++) {
      const ownerId = ownerIds[i]?.trim();
      const resourceType = resourceTypes[i]?.trim();
      if (!ownerId || !resourceType) continue;
      if (resourceType !== "song" && resourceType !== "songbook") {
        return fail(400, { error: `Invalid resource type: ${resourceType}` });
      }
      collaborations.push({ ownerId, resourceType });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      return fail(400, { error: "A user with this email already exists" });
    }

    const existingInvite = await prisma.invite.findFirst({
      where: {
        email: email.toLowerCase(),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (existingInvite) {
      return fail(400, {
        error: "An active invite already exists for this email",
      });
    }

    // Validate that all specified owners actually exist
    if (collaborations.length > 0) {
      const ownerIdSet = Array.from(
        new Set(collaborations.map((c) => c.ownerId)),
      );
      const foundOwners = await prisma.user.findMany({
        where: { id: { in: ownerIdSet } },
        select: { id: true },
      });
      if (foundOwners.length !== ownerIdSet.length) {
        return fail(400, { error: "One or more selected owners do not exist" });
      }
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.invite.create({
      data: {
        email: email.toLowerCase(),
        token,
        role: userRole as "USER" | "ADMIN",
        expiresAt,
        sentById: session.user.id!,
        inviteCollaborations: {
          create: collaborations.map((c) => ({
            ownerId: c.ownerId,
            resourceType: c.resourceType,
            // role defaults to EDITOR in the schema
          })),
        },
      },
    });

    const signupUrl = `/signup?token=${token}&email=${encodeURIComponent(email)}`;
    return { success: true, signupUrl };
  },

  delete: async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user) throw redirect(302, "/login");

    const role = (session.user as { role: string }).role;
    if (role !== "ADMIN") throw redirect(302, "/songs");

    const formData = await request.formData();
    const id = formData.get("id") as string;

    // Cascade delete also removes associated InviteCollaboration rows
    await prisma.invite.delete({ where: { id } });

    return { success: true };
  },
};
