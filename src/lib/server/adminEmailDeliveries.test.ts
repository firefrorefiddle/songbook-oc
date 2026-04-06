import { describe, expect, it, vi } from "vitest";

import {
  getAdminEmailDeliveriesOverview,
  normaliseAdminEmailDeliveryFilters,
} from "./adminEmailDeliveries";

function makePrismaMock() {
  return {
    emailDelivery: {
      findMany: vi.fn(),
    },
  } as any;
}

describe("adminEmailDeliveries helpers", () => {
  it("normalises query filters for the admin delivery page", () => {
    const filters = normaliseAdminEmailDeliveryFilters(
      new URL(
        "https://songbook.example.org/admin/email-deliveries?search= reset &status=FAILED&template=password_reset",
      ),
    );

    expect(filters).toEqual({
      search: "reset",
      status: "FAILED",
      template: "password_reset",
    });
  });

  it("normalises collaborator_added template filter", () => {
    const filters = normaliseAdminEmailDeliveryFilters(
      new URL(
        "https://songbook.example.org/admin/email-deliveries?template=collaborator_added",
      ),
    );

    expect(filters.template).toBe("collaborator_added");
  });

  it("builds recent delivery rows with related record summaries", async () => {
    const prisma = makePrismaMock();
    prisma.emailDelivery.findMany.mockResolvedValue([
      {
        id: "delivery-1",
        template: "invite",
        toEmail: "invitee@example.com",
        fromEmail: "no-reply@example.com",
        subject: "Your Songbook invitation",
        transport: "sendmail",
        status: "SENT",
        metadata: JSON.stringify({
          signupUrl: "https://songbook.example.org/signup?token=abc",
          expiresAt: "2099-04-10T09:00:00.000Z",
          requireEmailVerification: true,
        }),
        providerMessageId: "smtp-123",
        errorMessage: null,
        createdAt: new Date("2099-04-01T09:00:00.000Z"),
        sentAt: new Date("2099-04-01T09:01:00.000Z"),
        invite: {
          email: "invitee@example.com",
          sentBy: {
            email: "admin@example.com",
            firstName: "Jane",
            lastName: "Admin",
            username: "jane",
            name: null,
          },
        },
        passwordResetToken: null,
      },
      {
        id: "delivery-2",
        template: "password_reset",
        toEmail: "member@example.com",
        fromEmail: "no-reply@example.com",
        subject: "Reset your Songbook password",
        transport: "log",
        status: "FAILED",
        metadata: JSON.stringify({
          resetUrl: "https://songbook.example.org/reset-password?token=xyz",
        }),
        providerMessageId: null,
        errorMessage: "Mailbox unavailable",
        createdAt: new Date("2099-04-01T08:00:00.000Z"),
        sentAt: null,
        invite: null,
        passwordResetToken: {
          user: {
            email: "member@example.com",
            firstName: "Mira",
            lastName: "Member",
            username: null,
            name: null,
          },
        },
      },
      {
        id: "delivery-3",
        template: "collaborator_added",
        toEmail: "collab@example.com",
        fromEmail: "no-reply@example.com",
        subject: "You were added as a collaborator on a song",
        transport: "log",
        status: "SENT",
        metadata: JSON.stringify({
          resourceType: "song",
          resourceTitle: "Test Hymn",
          resourceUrl: "https://songbook.example.org/songs/s1",
          role: "EDITOR",
          grantedByDisplayName: "Owner One",
          collaboratorDisplayName: "New Editor",
        }),
        providerMessageId: "/tmp/eml",
        errorMessage: null,
        createdAt: new Date("2099-04-01T07:00:00.000Z"),
        sentAt: new Date("2099-04-01T07:00:01.000Z"),
        invite: null,
        passwordResetToken: null,
      },
    ]);

    const result = await getAdminEmailDeliveriesOverview(prisma, {
      search: "",
      status: "ALL",
      template: "ALL",
    });

    expect(result.summary).toEqual({
      total: 3,
      sent: 2,
      failed: 1,
      pending: 0,
    });
    expect(result.deliveries).toEqual([
      expect.objectContaining({
        id: "delivery-1",
        relatedEntityLabel: "Invite for invitee@example.com from Jane Admin",
        metadataSummary: expect.arrayContaining([
          expect.objectContaining({ label: "Signup URL" }),
          expect.objectContaining({
            label: "Email verification",
            value: "Required",
          }),
        ]),
      }),
      expect.objectContaining({
        id: "delivery-2",
        relatedEntityLabel: "Password reset for Mira Member",
        errorMessage: "Mailbox unavailable",
        metadataSummary: expect.arrayContaining([
          expect.objectContaining({ label: "Reset URL" }),
        ]),
      }),
      expect.objectContaining({
        id: "delivery-3",
        relatedEntityLabel: "Song collaboration: Test Hymn",
        metadataSummary: expect.arrayContaining([
          expect.objectContaining({ label: "Resource URL" }),
          expect.objectContaining({ label: "Granted by" }),
        ]),
      }),
    ]);
  });

  it("filters rows by status, template, and free-text search", async () => {
    const prisma = makePrismaMock();
    prisma.emailDelivery.findMany.mockResolvedValue([
      {
        id: "delivery-1",
        template: "invite",
        toEmail: "invitee@example.com",
        fromEmail: "no-reply@example.com",
        subject: "Your Songbook invitation",
        transport: "sendmail",
        status: "SENT",
        metadata: "{}",
        providerMessageId: "smtp-123",
        errorMessage: null,
        createdAt: new Date("2099-04-01T09:00:00.000Z"),
        sentAt: new Date("2099-04-01T09:01:00.000Z"),
        invite: {
          email: "invitee@example.com",
          sentBy: {
            email: "admin@example.com",
            firstName: "Jane",
            lastName: "Admin",
            username: null,
            name: null,
          },
        },
        passwordResetToken: null,
      },
      {
        id: "delivery-2",
        template: "password_reset",
        toEmail: "member@example.com",
        fromEmail: "no-reply@example.com",
        subject: "Reset your Songbook password",
        transport: "log",
        status: "FAILED",
        metadata: "{}",
        providerMessageId: null,
        errorMessage: "Mailbox unavailable",
        createdAt: new Date("2099-04-01T08:00:00.000Z"),
        sentAt: null,
        invite: null,
        passwordResetToken: {
          user: {
            email: "member@example.com",
            firstName: "Mira",
            lastName: "Member",
            username: null,
            name: null,
          },
        },
      },
    ]);

    const result = await getAdminEmailDeliveriesOverview(prisma, {
      search: "mailbox",
      status: "FAILED",
      template: "password_reset",
    });

    expect(result.deliveries).toHaveLength(1);
    expect(result.deliveries[0]?.id).toBe("delivery-2");
  });
});
