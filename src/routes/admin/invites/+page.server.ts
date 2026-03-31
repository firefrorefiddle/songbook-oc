import type { PageServerLoad, Actions } from "./$types";
import { prisma } from "$lib/server/prisma";
import { redirect, fail } from "@sveltejs/kit";
import { randomBytes } from "crypto";

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw redirect(302, "/login");

  const role = (session.user as { role: string }).role;
  if (role !== "ADMIN") throw redirect(302, "/songs");

  const invites = await prisma.invite.findMany({
    orderBy: { expiresAt: "desc" },
    include: { sentBy: { select: { name: true, email: true } } },
  });

  return { invites };
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

    if (!email?.trim()) {
      return fail(400, { error: "Email is required" });
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
      },
    });

    return { success: true };
  },

  delete: async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session?.user) throw redirect(302, "/login");

    const role = (session.user as { role: string }).role;
    if (role !== "ADMIN") throw redirect(302, "/songs");

    const formData = await request.formData();
    const id = formData.get("id") as string;

    await prisma.invite.delete({ where: { id } });

    return { success: true };
  },
};
