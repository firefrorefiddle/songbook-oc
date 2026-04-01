import { beforeEach, describe, expect, it, vi } from "vitest";

const emailMocks = vi.hoisted(() => ({
  buildPasswordResetUrl: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock("./email", () => ({
  sendPasswordResetEmail: emailMocks.sendPasswordResetEmail,
  buildPasswordResetUrl: emailMocks.buildPasswordResetUrl,
}));

import {
  buildPasswordResetExpiry,
  createPasswordResetRequest,
  getPasswordResetTokenStatus,
  hashPasswordResetToken,
  resetPasswordWithToken,
} from "./passwordReset";

describe("passwordReset helpers", () => {
  beforeEach(() => {
    emailMocks.sendPasswordResetEmail.mockReset();
    emailMocks.buildPasswordResetUrl.mockReset();
    emailMocks.sendPasswordResetEmail.mockResolvedValue({
      status: "SENT",
      transport: "log",
    });
    emailMocks.buildPasswordResetUrl.mockReturnValue(
      "https://songbook.example.org/reset-password?token=raw-token",
    );
  });

  it("hashes raw reset tokens deterministically", () => {
    expect(hashPasswordResetToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("builds an expiry two hours from the given time", () => {
    expect(
      buildPasswordResetExpiry(new Date("2026-04-01T10:00:00Z")).toISOString(),
    ).toBe("2026-04-01T12:00:00.000Z");
  });

  it("does nothing for unknown email addresses", async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as any;

    const result = await createPasswordResetRequest(prisma, {
      email: "missing@example.org",
      baseUrl: "https://songbook.example.org",
    });

    expect(result).toEqual({ status: "ignored" });
    expect(emailMocks.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("creates a reset token, invalidates older ones, and sends an email", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 2 });
    const create = vi.fn().mockResolvedValue({ id: "prt-1" });
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "user-1",
          email: "user@example.org",
          firstName: "Jane",
          lastName: "User",
          username: "jane",
          isActive: true,
        }),
      },
      passwordResetToken: {
        updateMany,
        create,
      },
    } as any;

    const result = await createPasswordResetRequest(prisma, {
      email: "USER@example.org",
      baseUrl: "https://songbook.example.org",
    });

    expect(result.status).toBe("created");
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        usedAt: null,
      },
      data: {
        usedAt: expect.any(Date),
      },
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      },
      select: {
        id: true,
      },
    });
    expect(emailMocks.buildPasswordResetUrl).toHaveBeenCalledWith(
      "https://songbook.example.org",
      expect.any(String),
    );
    expect(emailMocks.sendPasswordResetEmail).toHaveBeenCalledWith({
      passwordResetTokenId: "prt-1",
      toEmail: "user@example.org",
      resetUrl: "https://songbook.example.org/reset-password?token=raw-token",
      expiresAt: expect.any(Date),
      userDisplayName: "Jane User",
    });
  });

  it("reports token status for used, expired, and valid tokens", async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValueOnce({
        id: "prt-used",
        userId: "user-1",
        expiresAt: new Date("2026-04-01T13:00:00Z"),
        usedAt: new Date("2026-04-01T11:00:00Z"),
        user: { id: "user-1", email: "user@example.org", isActive: true },
      })
      .mockResolvedValueOnce({
        id: "prt-expired",
        userId: "user-1",
        expiresAt: new Date("2026-04-01T09:00:00Z"),
        usedAt: null,
        user: { id: "user-1", email: "user@example.org", isActive: true },
      })
      .mockResolvedValueOnce({
        id: "prt-valid",
        userId: "user-1",
        expiresAt: new Date("2999-04-01T13:00:00Z"),
        usedAt: null,
        user: { id: "user-1", email: "user@example.org", isActive: true },
      });
    const prisma = {
      passwordResetToken: {
        findUnique,
      },
    } as any;

    expect(await getPasswordResetTokenStatus(prisma, "used")).toBe("used");
    expect(await getPasswordResetTokenStatus(prisma, "expired")).toBe("expired");
    expect(await getPasswordResetTokenStatus(prisma, "valid")).toBe("valid");
  });

  it("updates the password and consumes all outstanding reset tokens", async () => {
    const tx = {
      passwordResetToken: {
        updateMany: vi
          .fn()
          .mockResolvedValueOnce({ count: 1 })
          .mockResolvedValueOnce({ count: 1 }),
      },
      user: {
        update: vi.fn().mockResolvedValue({ id: "user-1" }),
      },
    };
    const prisma = {
      passwordResetToken: {
        findUnique: vi.fn().mockResolvedValue({
          id: "prt-valid",
          userId: "user-1",
          expiresAt: new Date("2999-04-01T13:00:00Z"),
          usedAt: null,
          user: { id: "user-1", email: "user@example.org", isActive: true },
        }),
      },
      user: {},
      $transaction: vi.fn(async (callback) => callback(tx)),
    } as any;

    const result = await resetPasswordWithToken(prisma, {
      token: "valid-token",
      newPassword: "new-password-123",
    });

    expect(result).toEqual({ status: "reset" });
    expect(tx.passwordResetToken.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: "prt-valid",
        usedAt: null,
      },
      data: {
        usedAt: expect.any(Date),
      },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        passwordHash: expect.any(String),
      },
    });
    expect(tx.passwordResetToken.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        userId: "user-1",
        usedAt: null,
      },
      data: {
        usedAt: expect.any(Date),
      },
    });
  });
});
