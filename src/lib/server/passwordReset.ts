import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import {
  buildPasswordResetUrl,
  sendPasswordResetEmail,
} from "./email";

const PASSWORD_RESET_LIFETIME_HOURS = 2;
const PASSWORD_HASH_ROUNDS = 12;

type PasswordResetPrisma = Pick<
  PrismaClient,
  "passwordResetToken" | "user" | "$transaction"
>;

type PasswordResetTokenRecord = {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
  user: {
    id: string;
    email: string;
    isActive: boolean;
  };
};

export type PasswordResetTokenStatus =
  | "invalid"
  | "expired"
  | "used"
  | "valid";

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildPasswordResetExpiry(from = new Date()) {
  const expiresAt = new Date(from);
  expiresAt.setHours(expiresAt.getHours() + PASSWORD_RESET_LIFETIME_HOURS);
  return expiresAt;
}

function getPasswordResetDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
}) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.username || null;
}

async function findPasswordResetToken(
  prisma: PasswordResetPrisma,
  token: string,
): Promise<PasswordResetTokenRecord | null> {
  if (!token.trim()) {
    return null;
  }

  return prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashPasswordResetToken(token) },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          isActive: true,
        },
      },
    },
  });
}

export async function getPasswordResetTokenStatus(
  prisma: PasswordResetPrisma,
  token: string,
) {
  const record = await findPasswordResetToken(prisma, token);
  if (!record || !record.user.isActive) {
    return "invalid" satisfies PasswordResetTokenStatus;
  }

  if (record.usedAt) {
    return "used" satisfies PasswordResetTokenStatus;
  }

  if (record.expiresAt < new Date()) {
    return "expired" satisfies PasswordResetTokenStatus;
  }

  return "valid" satisfies PasswordResetTokenStatus;
}

export async function createPasswordResetRequest(
  prisma: PasswordResetPrisma,
  input: {
    email: string;
    baseUrl: string;
  },
) {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    return { status: "ignored" as const };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      username: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    return { status: "ignored" as const };
  }

  const issuedAt = new Date();
  const expiresAt = buildPasswordResetExpiry(issuedAt);
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashPasswordResetToken(token);

  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
    data: {
      usedAt: issuedAt,
    },
  });

  const resetToken = await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
    select: {
      id: true,
    },
  });

  const resetUrl = buildPasswordResetUrl(input.baseUrl, token);

  const emailDelivery = await sendPasswordResetEmail({
    passwordResetTokenId: resetToken.id,
    toEmail: user.email,
    resetUrl,
    expiresAt,
    userDisplayName: getPasswordResetDisplayName(user),
  });

  return {
    status: "created" as const,
    expiresAt,
    emailDelivery,
  };
}

export async function resetPasswordWithToken(
  prisma: PasswordResetPrisma,
  input: {
    token: string;
    newPassword: string;
  },
) {
  const tokenRecord = await findPasswordResetToken(prisma, input.token);
  if (!tokenRecord || !tokenRecord.user.isActive) {
    return { status: "invalid" as const };
  }

  if (tokenRecord.usedAt) {
    return { status: "used" as const };
  }

  const now = new Date();
  if (tokenRecord.expiresAt < now) {
    return { status: "expired" as const };
  }

  const passwordHash = await bcrypt.hash(input.newPassword, PASSWORD_HASH_ROUNDS);

  await prisma.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.updateMany({
      where: {
        id: tokenRecord.id,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    });

    if (consumed.count !== 1) {
      throw new Error("Password reset token could not be consumed");
    }

    await tx.user.update({
      where: { id: tokenRecord.userId },
      data: {
        passwordHash,
      },
    });

    await tx.passwordResetToken.updateMany({
      where: {
        userId: tokenRecord.userId,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    });
  });

  return { status: "reset" as const };
}
