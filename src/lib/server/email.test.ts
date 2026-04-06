import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockEnv = vi.hoisted(() => ({
  APP_BASE_URL: "",
  EMAIL_FROM: "",
  EMAIL_LOG_DIR: "",
  EMAIL_SENDMAIL_COMMAND: "",
  EMAIL_TRANSPORT: "",
  MAILGUN_API_KEY: "",
  MAILGUN_BASE_URL: "",
  MAILGUN_DOMAIN: "",
}));

vi.mock("$env/dynamic/private", () => ({
  env: mockEnv,
}));

vi.mock("./prisma", () => ({
  prisma: {
    emailDelivery: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import {
  buildCollaboratorAddedEmail,
  buildInviteEmail,
  buildInviteSignupUrl,
  buildPasswordResetEmail,
  buildPasswordResetUrl,
  resolvePublicBaseUrl,
  sendCollaboratorAddedEmail,
  sendInviteEmail,
} from "./email";

describe("email helpers", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.APP_BASE_URL = "";
    mockEnv.EMAIL_FROM = "";
    mockEnv.EMAIL_LOG_DIR = "";
    mockEnv.EMAIL_SENDMAIL_COMMAND = "";
    mockEnv.EMAIL_TRANSPORT = "";
    mockEnv.MAILGUN_API_KEY = "";
    mockEnv.MAILGUN_BASE_URL = "";
    mockEnv.MAILGUN_DOMAIN = "";
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

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

  it("builds an absolute password reset URL", () => {
    const resetUrl = buildPasswordResetUrl(
      "https://songbook.example.org",
      "token-123",
    );

    expect(resetUrl).toBe(
      "https://songbook.example.org/reset-password?token=token-123",
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

  it("renders collaborator-added copy for a song with resource URL", () => {
    const message = buildCollaboratorAddedEmail({
      collaboratorDisplayName: "Chris Collaborator",
      grantedByDisplayName: "Olivia Owner",
      resourceType: "song",
      resourceTitle: "Amazing Grace",
      resourceUrl: "https://songbook.example.org/songs/song-1",
      role: "EDITOR",
    });

    expect(message.subject).toBe("You were added as a collaborator on a song");
    expect(message.text).toContain("Olivia Owner added you as an editor");
    expect(message.text).toContain('the song "Amazing Grace"');
    expect(message.text).toContain(
      "https://songbook.example.org/songs/song-1",
    );
  });

  it("renders collaborator-added copy for an admin role on a songbook", () => {
    const message = buildCollaboratorAddedEmail({
      collaboratorDisplayName: "Chris Collaborator",
      grantedByDisplayName: "Olivia Owner",
      resourceType: "songbook",
      resourceTitle: "Sunday Set",
      resourceUrl: "https://songbook.example.org/songbooks/sb-1",
      role: "ADMIN",
    });

    expect(message.subject).toBe(
      "You were added as a collaborator on a songbook",
    );
    expect(message.text).toContain("admin collaborator");
    expect(message.text).toContain('the songbook "Sunday Set"');
  });

  it("renders password reset copy with the reset link", () => {
    const message = buildPasswordResetEmail({
      resetUrl: "https://songbook.example.org/reset-password?token=abc",
      expiresAt: new Date("2026-04-08T12:00:00Z"),
      userDisplayName: "Jane User",
    });

    expect(message.subject).toBe("Reset your Songbook password");
    expect(message.text).toContain("Hello Jane User,");
    expect(message.text).toContain("reset your Songbook password");
    expect(message.text).toContain(
      "https://songbook.example.org/reset-password?token=abc",
    );
  });

  it("sends email through Mailgun when configured", async () => {
    mockEnv.EMAIL_TRANSPORT = "mailgun";
    mockEnv.MAILGUN_API_KEY = "test-key";
    mockEnv.MAILGUN_DOMAIN = "sandbox.example.mailgun.org";
    mockEnv.MAILGUN_BASE_URL = "https://api.mailgun.net";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({ id: "<message-id@example.mailgun.org>" }),
      ),
    });
    global.fetch = fetchMock as typeof fetch;

    const { prisma } = await import("./prisma");
    vi.mocked(prisma.emailDelivery.create).mockResolvedValue({
      id: "delivery-1",
    } as never);
    vi.mocked(prisma.emailDelivery.update).mockResolvedValue({} as never);

    const result = await sendInviteEmail({
      inviteId: "invite-1",
      toEmail: "user@example.org",
      signupUrl: "https://songbook.example.org/signup?token=abc",
      expiresAt: new Date("2026-04-08T12:00:00Z"),
      requireEmailVerification: false,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mailgun.net/v3/sandbox.example.mailgun.org/messages",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(result).toEqual({
      status: "SENT",
      transport: "mailgun",
      providerMessageId: "<message-id@example.mailgun.org>",
    });
  });

  it("sends collaborator_added email through Mailgun when configured", async () => {
    mockEnv.EMAIL_TRANSPORT = "mailgun";
    mockEnv.MAILGUN_API_KEY = "test-key";
    mockEnv.MAILGUN_DOMAIN = "sandbox.example.mailgun.org";
    mockEnv.MAILGUN_BASE_URL = "https://api.mailgun.net";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({ id: "<collab-msg@example.mailgun.org>" }),
      ),
    });
    global.fetch = fetchMock as typeof fetch;

    const { prisma } = await import("./prisma");
    vi.mocked(prisma.emailDelivery.create).mockResolvedValue({
      id: "delivery-collab-1",
    } as never);
    vi.mocked(prisma.emailDelivery.update).mockResolvedValue({} as never);

    const result = await sendCollaboratorAddedEmail({
      toEmail: "collab@example.org",
      collaboratorDisplayName: "Chris",
      grantedByDisplayName: "Olivia",
      resourceType: "song",
      resourceTitle: "Test Song",
      resourceUrl: "https://songbook.example.org/songs/s1",
      role: "EDITOR",
    });

    expect(fetchMock).toHaveBeenCalled();
    expect(result).toEqual({
      status: "SENT",
      transport: "mailgun",
      providerMessageId: "<collab-msg@example.mailgun.org>",
    });
    expect(prisma.emailDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          template: "collaborator_added",
          toEmail: "collab@example.org",
        }),
      }),
    );
  });
});
