import { describe, expect, it, vi } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    emailDelivery: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import {
  buildInviteEmail,
  buildInviteSignupUrl,
  resolvePublicBaseUrl,
} from "./email";

describe("email helpers", () => {
  it("builds an absolute signup URL with encoded query params", () => {
    const signupUrl = buildInviteSignupUrl(
      "https://songbook.example.org",
      "token-123",
      "user+test@example.org",
    );

    expect(signupUrl).toBe(
      "https://songbook.example.org/signup?token=token-123&email=user%2Btest%40example.org",
    );
  });

  it("normalises trailing slashes when using the request origin", () => {
    expect(resolvePublicBaseUrl("http://localhost:5173/")).toBe(
      "http://localhost:5173",
    );
  });

  it("renders invite copy for verified email flows", () => {
    const message = buildInviteEmail({
      signupUrl: "https://songbook.example.org/signup?token=abc",
      expiresAt: new Date("2026-04-08T12:00:00Z"),
      invitedByName: "Jane Admin",
      requireEmailVerification: true,
    });

    expect(message.subject).toBe("Your Songbook invitation");
    expect(message.text).toContain("Jane Admin invited you to join Songbook.");
    expect(message.text).toContain("verify your email address");
  });

  it("renders invite copy without the verification instruction when not required", () => {
    const message = buildInviteEmail({
      signupUrl: "https://songbook.example.org/signup?token=abc",
      expiresAt: new Date("2026-04-08T12:00:00Z"),
      requireEmailVerification: false,
    });

    expect(message.text).toContain("Open the signup link to create your account.");
    expect(message.text).not.toContain("verify your email address");
  });
});
