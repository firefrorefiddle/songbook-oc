import type { Actions } from "./$types";

import { fail } from "@sveltejs/kit";

import { resolvePublicBaseUrl } from "$lib/server/email";
import { createPasswordResetRequest } from "$lib/server/passwordReset";
import { prisma } from "$lib/server/prisma";

const GENERIC_SUCCESS_MESSAGE =
  "If an active account exists for that email address, a password reset link has been sent.";

export const actions: Actions = {
  default: async ({ request, url }) => {
    const formData = await request.formData();
    const email = String(formData.get("email") ?? "");
    const fields = { email };

    if (!email.trim()) {
      return fail(400, {
        error: "Email is required",
        fields,
      });
    }

    await createPasswordResetRequest(prisma, {
      email,
      baseUrl: resolvePublicBaseUrl(url.origin),
    });

    return {
      success: GENERIC_SUCCESS_MESSAGE,
    };
  },
};
