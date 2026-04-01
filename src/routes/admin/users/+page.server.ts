import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

import {
  getAdminUsersOverview,
  resendInvite,
  setUserActiveState,
} from "$lib/server/adminUsers";
import { prisma } from "$lib/server/prisma";

async function requireAdmin(locals: App.Locals) {
  const session = await locals.auth();
  if (!session?.user) {
    throw redirect(302, "/login");
  }

  if (session.user.role !== "ADMIN") {
    throw redirect(302, "/songs");
  }

  return session;
}

export const load: PageServerLoad = async ({ locals }) => {
  await requireAdmin(locals);
  return getAdminUsersOverview(prisma);
};

export const actions: Actions = {
  toggleActive: async ({ request, locals }) => {
    const session = await requireAdmin(locals);
    const formData = await request.formData();
    const targetUserId = formData.get("userId");
    const nextState = formData.get("nextState");

    if (typeof targetUserId !== "string" || !targetUserId) {
      return fail(400, { error: "User is required" });
    }

    if (nextState !== "activate" && nextState !== "deactivate") {
      return fail(400, { error: "Invalid state change requested" });
    }

    try {
      await setUserActiveState(prisma, {
        actorUserId: session.user.id,
        targetUserId,
        isActive: nextState === "activate",
      });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update user";
      return fail(400, { error: message });
    }
  },

  resendInvite: async ({ request, locals }) => {
    const session = await requireAdmin(locals);
    const formData = await request.formData();
    const inviteId = formData.get("inviteId");

    if (typeof inviteId !== "string" || !inviteId) {
      return fail(400, { error: "Invite is required" });
    }

    try {
      const result = await resendInvite(prisma, {
        actorUserId: session.user.id,
        inviteId,
      });
      return { success: true, signupUrl: result.signupUrl, inviteEmail: result.email };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not resend invite";
      return fail(400, { error: message });
    }
  },
};
