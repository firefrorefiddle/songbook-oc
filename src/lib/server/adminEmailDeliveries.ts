import type { PrismaClient } from "@prisma/client";

import { getUserDisplayName } from "./adminUsers";

type EmailDeliveryPrisma = Pick<PrismaClient, "emailDelivery">;

export interface AdminEmailDeliveryFilters {
  search: string;
  status: "ALL" | "PENDING" | "SENT" | "FAILED";
  template:
    | "ALL"
    | "invite"
    | "password_reset"
    | "collaborator_added";
}

export interface AdminEmailDeliveryRow {
  id: string;
  template: string;
  toEmail: string;
  fromEmail: string;
  subject: string;
  transport: string;
  status: "PENDING" | "SENT" | "FAILED";
  createdAt: Date;
  sentAt: Date | null;
  providerMessageId: string | null;
  errorMessage: string | null;
  relatedEntityLabel: string;
  metadataSummary: Array<{
    label: string;
    value: string;
  }>;
}

interface ParsedMetadata {
  signupUrl?: unknown;
  resetUrl?: unknown;
  expiresAt?: unknown;
  requireEmailVerification?: unknown;
  resourceType?: unknown;
  resourceTitle?: unknown;
  resourceUrl?: unknown;
  role?: unknown;
  grantedByDisplayName?: unknown;
  collaboratorDisplayName?: unknown;
}

const RECENT_DELIVERY_LIMIT = 200;

function parseMetadata(metadata: string): ParsedMetadata {
  try {
    const parsed = JSON.parse(metadata) as ParsedMetadata;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function formatDateTime(value: unknown) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString("en-GB");
}

function buildMetadataSummary(metadata: ParsedMetadata) {
  const summary: AdminEmailDeliveryRow["metadataSummary"] = [];

  if (typeof metadata.signupUrl === "string" && metadata.signupUrl) {
    summary.push({ label: "Signup URL", value: metadata.signupUrl });
  }

  if (typeof metadata.resetUrl === "string" && metadata.resetUrl) {
    summary.push({ label: "Reset URL", value: metadata.resetUrl });
  }

  const expiresAt = formatDateTime(metadata.expiresAt);
  if (expiresAt) {
    summary.push({ label: "Expires", value: expiresAt });
  }

  if (typeof metadata.requireEmailVerification === "boolean") {
    summary.push({
      label: "Email verification",
      value: metadata.requireEmailVerification ? "Required" : "Not required",
    });
  }

  if (typeof metadata.resourceUrl === "string" && metadata.resourceUrl) {
    summary.push({ label: "Resource URL", value: metadata.resourceUrl });
  }

  if (metadata.resourceType === "song" || metadata.resourceType === "songbook") {
    summary.push({
      label: "Resource type",
      value: metadata.resourceType,
    });
  }

  if (typeof metadata.resourceTitle === "string" && metadata.resourceTitle) {
    summary.push({ label: "Resource title", value: metadata.resourceTitle });
  }

  if (metadata.role === "EDITOR" || metadata.role === "ADMIN") {
    summary.push({ label: "Role", value: metadata.role });
  }

  if (
    typeof metadata.grantedByDisplayName === "string" &&
    metadata.grantedByDisplayName
  ) {
    summary.push({
      label: "Granted by",
      value: metadata.grantedByDisplayName,
    });
  }

  if (
    typeof metadata.collaboratorDisplayName === "string" &&
    metadata.collaboratorDisplayName
  ) {
    summary.push({
      label: "Collaborator",
      value: metadata.collaboratorDisplayName,
    });
  }

  return summary;
}

function getRelatedEntityLabel(
  delivery: {
    template: string;
    invite: {
      email: string;
      sentBy: {
        email: string;
        firstName: string | null;
        lastName: string | null;
        username: string | null;
        name: string | null;
      };
    } | null;
    passwordResetToken: {
      user: {
        email: string;
        firstName: string | null;
        lastName: string | null;
        username: string | null;
        name: string | null;
      };
    } | null;
  },
  metadata: ParsedMetadata,
) {
  if (delivery.invite) {
    return `Invite for ${delivery.invite.email} from ${getUserDisplayName(delivery.invite.sentBy)}`;
  }

  if (delivery.passwordResetToken) {
    return `Password reset for ${getUserDisplayName(delivery.passwordResetToken.user)}`;
  }

  if (delivery.template === "collaborator_added") {
    const title =
      typeof metadata.resourceTitle === "string" ? metadata.resourceTitle : "";
    const kind =
      metadata.resourceType === "songbook"
        ? "Songbook"
        : metadata.resourceType === "song"
          ? "Song"
          : "Resource";
    if (title) {
      return `${kind} collaboration: ${title}`;
    }
    return "Collaboration added";
  }

  return "No linked record";
}

function matchesSearch(row: AdminEmailDeliveryRow, search: string) {
  if (!search) {
    return true;
  }

  const query = search.toLowerCase();
  return [
    row.toEmail,
    row.fromEmail,
    row.subject,
    row.transport,
    row.status,
    row.template,
    row.relatedEntityLabel,
    row.providerMessageId ?? "",
    row.errorMessage ?? "",
    ...row.metadataSummary.map((item) => `${item.label} ${item.value}`),
  ].some((value) => value.toLowerCase().includes(query));
}

export function normaliseAdminEmailDeliveryFilters(
  url: URL,
): AdminEmailDeliveryFilters {
  const search = url.searchParams.get("search")?.trim() ?? "";
  const status = url.searchParams.get("status");
  const template = url.searchParams.get("template");

  return {
    search,
    status:
      status === "PENDING" || status === "SENT" || status === "FAILED"
        ? status
        : "ALL",
    template:
      template === "invite" ||
      template === "password_reset" ||
      template === "collaborator_added"
        ? template
        : "ALL",
  };
}

export async function getAdminEmailDeliveriesOverview(
  prisma: EmailDeliveryPrisma,
  filters: AdminEmailDeliveryFilters,
) {
  const deliveries = await prisma.emailDelivery.findMany({
    take: RECENT_DELIVERY_LIMIT,
    orderBy: { createdAt: "desc" },
    include: {
      invite: {
        select: {
          email: true,
          sentBy: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              username: true,
              name: true,
            },
          },
        },
      },
      passwordResetToken: {
        select: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              username: true,
              name: true,
            },
          },
        },
      },
    },
  });

  const rows: AdminEmailDeliveryRow[] = deliveries.map((delivery) => {
    const metadata = parseMetadata(delivery.metadata);

    return {
      id: delivery.id,
      template: delivery.template,
      toEmail: delivery.toEmail,
      fromEmail: delivery.fromEmail,
      subject: delivery.subject,
      transport: delivery.transport,
      status: delivery.status,
      createdAt: delivery.createdAt,
      sentAt: delivery.sentAt,
      providerMessageId: delivery.providerMessageId,
      errorMessage: delivery.errorMessage,
      relatedEntityLabel: getRelatedEntityLabel(delivery, metadata),
      metadataSummary: buildMetadataSummary(metadata),
    };
  });

  const filteredRows = rows.filter((row) => {
    if (filters.status !== "ALL" && row.status !== filters.status) {
      return false;
    }

    if (filters.template !== "ALL" && row.template !== filters.template) {
      return false;
    }

    return matchesSearch(row, filters.search);
  });

  return {
    filters,
    deliveries: filteredRows,
    summary: {
      total: rows.length,
      sent: rows.filter((row) => row.status === "SENT").length,
      failed: rows.filter((row) => row.status === "FAILED").length,
      pending: rows.filter((row) => row.status === "PENDING").length,
    },
  };
}
