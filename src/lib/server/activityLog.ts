import type { ActivityAction, ResourceType } from "@prisma/client";
import { prisma } from "./prisma";

interface ActivityLogInput {
  actorId: string;
  action: ActivityAction;
  resourceType: ResourceType;
  resourceId: string;
  sourceResourceId?: string;
  sourceResourceType?: ResourceType;
  metadata?: Record<string, unknown>;
}

export async function logActivity(input: ActivityLogInput): Promise<void> {
  await prisma.activityLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      sourceResourceId: input.sourceResourceId,
      sourceResourceType: input.sourceResourceType,
      metadata: JSON.stringify(input.metadata || {}),
    },
  });
}

export async function getActivityLogs(params: {
  resourceType?: ResourceType;
  resourceId?: string;
  actorId?: string;
  limit?: number;
  offset?: number;
}): Promise<
  Array<{
    id: string;
    createdAt: Date;
    actorId: string;
    actor: { firstName: string | null; lastName: string | null; email: string };
    action: ActivityAction;
    resourceType: ResourceType;
    resourceId: string;
    sourceResourceId: string | null;
    sourceResourceType: ResourceType | null;
    metadata: Record<string, unknown>;
  }>
> {
  const { resourceType, resourceId, actorId, limit = 50, offset = 0 } = params;

  const where: Record<string, unknown> = {};
  if (resourceType && resourceId) {
    where.resourceType = resourceType;
    where.resourceId = resourceId;
  }
  if (actorId) {
    where.actorId = actorId;
  }

  const logs = await prisma.activityLog.findMany({
    where,
    include: {
      actor: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  return logs.map((log) => ({
    ...log,
    metadata: JSON.parse(log.metadata),
  }));
}

export async function getRecentActivity(limit = 20): Promise<
  Array<{
    id: string;
    createdAt: Date;
    actorId: string;
    actor: { firstName: string | null; lastName: string | null; email: string };
    action: ActivityAction;
    resourceType: ResourceType;
    resourceId: string;
    sourceResourceId: string | null;
    sourceResourceType: ResourceType | null;
    metadata: Record<string, unknown>;
  }>
> {
  const logs = await prisma.activityLog.findMany({
    include: {
      actor: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return logs.map((log) => ({
    ...log,
    metadata: JSON.parse(log.metadata),
  }));
}
