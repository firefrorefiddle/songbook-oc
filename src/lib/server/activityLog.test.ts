import { describe, it, expect, beforeEach, vi } from "vitest";
import { logActivity, getActivityLogs, getRecentActivity } from "./activityLog";
import { prisma } from "./prisma";

vi.mock("./prisma", () => ({
  prisma: {
    activityLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("activityLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logActivity", () => {
    it("should create an activity log entry", async () => {
      const mockCreate = vi.mocked(prisma.activityLog.create);
      mockCreate.mockResolvedValue({} as any);

      await logActivity({
        actorId: "user-1",
        action: "SONG_CREATED",
        resourceType: "SONG",
        resourceId: "song-1",
        metadata: { title: "Test Song" },
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          actorId: "user-1",
          action: "SONG_CREATED",
          resourceType: "SONG",
          resourceId: "song-1",
          sourceResourceId: undefined,
          sourceResourceType: undefined,
          metadata: JSON.stringify({ title: "Test Song" }),
        },
      });
    });

    it("should handle fork activity with source resource", async () => {
      const mockCreate = vi.mocked(prisma.activityLog.create);
      mockCreate.mockResolvedValue({} as any);

      await logActivity({
        actorId: "user-1",
        action: "SONG_FORKED",
        resourceType: "SONG",
        resourceId: "song-2",
        sourceResourceId: "song-1",
        sourceResourceType: "SONG",
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          actorId: "user-1",
          action: "SONG_FORKED",
          resourceType: "SONG",
          resourceId: "song-2",
          sourceResourceId: "song-1",
          sourceResourceType: "SONG",
          metadata: "{}",
        },
      });
    });
  });

  describe("getActivityLogs", () => {
    it("should return activity logs with parsed metadata", async () => {
      const mockFindMany = vi.mocked(prisma.activityLog.findMany);
      mockFindMany.mockResolvedValue([
        {
          id: "log-1",
          createdAt: new Date("2024-01-01"),
          actorId: "user-1",
          actor: {
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
          },
          action: "SONG_CREATED",
          resourceType: "SONG",
          resourceId: "song-1",
          sourceResourceId: null,
          sourceResourceType: null,
          metadata: '{"title":"Test"}',
        },
      ] as any);

      const result = await getActivityLogs({ resourceId: "song-1" });

      expect(result).toHaveLength(1);
      expect(result[0].metadata).toEqual({ title: "Test" });
      expect(result[0].actor.email).toBe("john@example.com");
    });
  });

  describe("getRecentActivity", () => {
    it("should return recent activity logs with defaults", async () => {
      const mockFindMany = vi.mocked(prisma.activityLog.findMany);
      mockFindMany.mockResolvedValue([] as any);

      await getRecentActivity();

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          orderBy: { createdAt: "desc" },
        }),
      );
    });
  });
});
