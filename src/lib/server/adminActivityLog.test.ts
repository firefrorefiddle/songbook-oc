import { describe, it, expect, beforeEach, vi } from "vitest";
import { ActivityAction, ResourceType } from "@prisma/client";

import {
  buildAdminActivityWhere,
  getAdminActivityOverview,
  normaliseAdminActivityFilters,
} from "./adminActivityLog";
import { prisma } from "./prisma";

vi.mock("./prisma", () => ({
  prisma: {
    activityLog: {
      findMany: vi.fn(),
    },
  },
}));

describe("adminActivityLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normaliseAdminActivityFilters", () => {
    it("defaults to ALL when params missing", () => {
      const url = new URL("https://example.com/admin/activity");
      expect(normaliseAdminActivityFilters(url)).toEqual({
        action: "ALL",
        resourceType: "ALL",
      });
    });

    it("accepts valid action and resourceType", () => {
      const url = new URL(
        "https://example.com/admin/activity?action=SONG_CREATED&resourceType=SONG",
      );
      expect(normaliseAdminActivityFilters(url)).toEqual({
        action: "SONG_CREATED",
        resourceType: "SONG",
      });
    });

    it("ignores invalid action and resourceType", () => {
      const url = new URL("https://example.com/admin/activity?action=NOPE&resourceType=FAKE");
      expect(normaliseAdminActivityFilters(url)).toEqual({
        action: "ALL",
        resourceType: "ALL",
      });
    });
  });

  describe("buildAdminActivityWhere", () => {
    it("returns empty object when both ALL", () => {
      expect(buildAdminActivityWhere({ action: "ALL", resourceType: "ALL" })).toEqual({});
    });

    it("includes action when set", () => {
      expect(
        buildAdminActivityWhere({
          action: ActivityAction.INVITE_SENT,
          resourceType: "ALL",
        }),
      ).toEqual({ action: ActivityAction.INVITE_SENT });
    });

    it("includes resourceType when set", () => {
      expect(
        buildAdminActivityWhere({
          action: "ALL",
          resourceType: ResourceType.SONGBOOK,
        }),
      ).toEqual({ resourceType: ResourceType.SONGBOOK });
    });

    it("combines both filters", () => {
      expect(
        buildAdminActivityWhere({
          action: ActivityAction.SONG_FORKED,
          resourceType: ResourceType.SONG,
        }),
      ).toEqual({
        action: ActivityAction.SONG_FORKED,
        resourceType: ResourceType.SONG,
      });
    });
  });

  describe("getAdminActivityOverview", () => {
    it("maps rows and passes where to prisma", async () => {
      const mockFindMany = vi.mocked(prisma.activityLog.findMany);
      mockFindMany.mockResolvedValue([
        {
          id: "log-1",
          createdAt: new Date("2024-06-01T12:00:00Z"),
          action: ActivityAction.SONG_CREATED,
          resourceType: ResourceType.SONG,
          resourceId: "song-1",
          sourceResourceId: null,
          sourceResourceType: null,
          metadata: "{}",
          actor: {
            email: "a@example.com",
            firstName: "Ann",
            lastName: "Bee",
            username: null,
            name: null,
          },
        },
      ] as any);

      const result = await getAdminActivityOverview(prisma, {
        action: "ALL",
        resourceType: "ALL",
      });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          take: 200,
          orderBy: { createdAt: "desc" },
        }),
      );
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].actorDisplayName).toBe("Ann Bee");
      expect(result.entries[0].metadataPreview).toBe("—");
      expect(result.actionOptions).toContain(ActivityAction.SONG_CREATED);
      expect(result.resourceTypeOptions).toContain(ResourceType.SONG);
    });

    it("applies filters in query", async () => {
      const mockFindMany = vi.mocked(prisma.activityLog.findMany);
      mockFindMany.mockResolvedValue([] as any);

      await getAdminActivityOverview(prisma, {
        action: ActivityAction.USER_JOINED,
        resourceType: ResourceType.USER,
      });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            action: ActivityAction.USER_JOINED,
            resourceType: ResourceType.USER,
          },
        }),
      );
    });
  });
});
