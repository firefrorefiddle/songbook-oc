import type { Actions, PageServerLoad } from "./$types";

import { fail, redirect } from "@sveltejs/kit";

import {
  getPasswordResetTokenStatus,
  resetPasswordWithToken,
} from "$lib/server/passwordReset";
import { prisma } from "$lib/server/prisma";

function getResetPasswordError(status: "invalid" | "expired" | "used") {
  if (status === "expired") {
    return "This password reset link has expired. Request a new one.";
  }

  if (status === "used") {
    return "This password reset link has already been used. Request a new one.";
  }

  return "This password reset link is invalid. Request a new one.";
}

export const load: PageServerLoad = async ({ url }) => {
  const token = url.searchParams.get("token")?.trim() ?? "";
  const status = await getPasswordResetTokenStatus(prisma, token);

  if (status !== "valid") {
    return {
      error: getResetPasswordError(status),
      step: "invalid" as const,
      token: "",
    };
  }

  return {
    step: "reset" as const,
    token,
  };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const token = String(formData.get("token") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!token.trim()) {
      return fail(400, {
        resetError: "Password reset token is required.",
      });
    }

    if (!newPassword) {
      return fail(400, {
        resetError: "New password is required.",
        token,
      });
    }

    if (newPassword.length < 8) {
      return fail(400, {
        resetError: "New password must be at least 8 characters.",
        token,
      });
    }

    if (newPassword !== confirmPassword) {
      return fail(400, {
        resetError: "New passwords do not match.",
        token,
      });
    }

    const result = await resetPasswordWithToken(prisma, {
      token,
      newPassword,
    });

    if (result.status !== "reset") {
      return fail(400, {
        resetError: getResetPasswordError(result.status),
        token,
      });
    }

    throw redirect(303, "/login?reset=1");
  },
};
