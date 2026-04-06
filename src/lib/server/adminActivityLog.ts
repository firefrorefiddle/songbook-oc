import * as PrismaClientPkg from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

import { getUserDisplayName } from "./adminUsers";

/** Prisma enums via namespace import so SSR build avoids CJS named-export issues. */
const ActivityActionEnum = PrismaClientPkg.ActivityAction;
const ResourceTypeEnum = PrismaClientPkg.ResourceType;

type ActivityAction = PrismaClientPkg.ActivityAction;
type ResourceType = PrismaClientPkg.ResourceType;

type ActivityLogPrisma = Pick<PrismaClient, "activityLog">;

export interface AdminActivityFilters {
  action: ActivityAction | "ALL";
  resourceType: ResourceType | "ALL";
}

export interface AdminActivityRow {
  id: string;
  createdAt: Date;
  action: ActivityAction;
  resourceType: ResourceType;
  resourceId: string;
  sourceResourceId: string | null;
  sourceResourceType: ResourceType | null;
  actorDisplayName: string;
  actorEmail: string;
  metadataPreview: string;
}

const RECENT_ACTIVITY_LIMIT = 200;

/** Exposed for tests: build Prisma `where` from normalised filters. */
export function buildAdminActivityWhere(filters: AdminActivityFilters) {
  return {
    ...(filters.action !== "ALL" ? { action: filters.action } : {}),
    ...(filters.resourceType !== "ALL" ? { resourceType: filters.resourceType } : {}),
  };
}

function isActivityAction(value: string): value is ActivityAction {
  return (Object.values(ActivityActionEnum) as string[]).includes(value);
}

function isResourceType(value: string): value is ResourceType {
  return (Object.values(ResourceTypeEnum) as string[]).includes(value);
}

export function normaliseAdminActivityFilters(url: URL): AdminActivityFilters {
  const actionParam = url.searchParams.get("action")?.trim() ?? "";
  const resourceTypeParam = url.searchParams.get("resourceType")?.trim() ?? "";

  return {
    action: actionParam && isActivityAction(actionParam) ? actionParam : "ALL",
    resourceType:
      resourceTypeParam && isResourceType(resourceTypeParam) ? resourceTypeParam : "ALL",
  };
}

function formatMetadataPreview(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const keys = Object.keys(parsed as Record<string, unknown>);
      if (keys.length === 0) {
        return "—";
      }
      return JSON.stringify(parsed);
    }
    return raw.length > 120 ? `${raw.slice(0, 117)}…` : raw;
  } catch {
    return raw.length > 120 ? `${raw.slice(0, 117)}…` : raw;
  }
}

export async function getAdminActivityOverview(
  prisma: ActivityLogPrisma,
  filters: AdminActivityFilters,
): Promise<{
  filters: AdminActivityFilters;
  entries: AdminActivityRow[];
  actionOptions: ActivityAction[];
  resourceTypeOptions: ResourceType[];
}> {
  const where = buildAdminActivityWhere(filters);

  const logs = await prisma.activityLog.findMany({
    where,
    take: RECENT_ACTIVITY_LIMIT,
    orderBy: { createdAt: "desc" },
    include: {
      actor: {
        select: { email: true, firstName: true, lastName: true, username: true, name: true },
      },
    },
  });

  const entries: AdminActivityRow[] = logs.map((log) => ({
    id: log.id,
    createdAt: log.createdAt,
    action: log.action,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    sourceResourceId: log.sourceResourceId,
    sourceResourceType: log.sourceResourceType,
    actorDisplayName: getUserDisplayName(log.actor),
    actorEmail: log.actor.email,
    metadataPreview: formatMetadataPreview(log.metadata),
  }));

  return {
    filters,
    entries,
    actionOptions: Object.values(ActivityActionEnum),
    resourceTypeOptions: Object.values(ResourceTypeEnum),
  };
}
