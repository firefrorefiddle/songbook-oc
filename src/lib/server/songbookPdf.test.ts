import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { generateSongbookPdf } from "./songbookPdf";
import { prisma } from "./prisma";

describe("songbookPdf", () => {
  let testSongbookId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create a test user to satisfy the owner requirement
    const user = await prisma.user.create({
      data: {
        email: `test-pdf-${Date.now()}@example.com`,
        name: "Test User",
      },
    });
    testUserId = user.id;

    const song1 = await prisma.song.create({
      data: {
        ownerId: testUserId,
        versions: {
          create: {
            title: "Test Song One",
            author: "Test Author",
            content: `C          F             C            d G
Halleluja, lobet Gott in seinem Heiligt-um,
C                D            F G
lobet ihn in der Feste seiner M-acht!`,
            metadata: JSON.stringify({ copyright: "Test Copyright" }),
          },
        },
      },
      include: { versions: true },
    });

    const song2 = await prisma.song.create({
      data: {
        ownerId: testUserId,
        versions: {
          create: {
            title: "Test Song Two",
            author: "Another Author",
            content: `G                         C
Gott ist die Liebe,
G                         D
Gott ist die Liebe,
G              C          G
Gott ist die Liebe,
D              G
und liebt auch mich.`,
            metadata: JSON.stringify({ copyright: "Public Domain" }),
          },
        },
      },
      include: { versions: true },
    });

    const songbook = await prisma.songbook.create({
      data: {
        ownerId: testUserId,
        versions: {
          create: {
            title: "Test Songbook",
            description: "Test songbook for PDF generation",
            songs: {
              create: [
                {
                  songVersionId: song1.versions[0].id,
                  order: 0,
                },
                {
                  songVersionId: song2.versions[0].id,
                  order: 1,
                },
              ],
            },
          },
        },
      },
    });

    testSongbookId = songbook.id;
  });

  afterAll(async () => {
    // Delete in dependency order: songbooks and songs cascade-delete their versions,
    // but Song/Songbook reference the user so must be deleted before the user.
    await prisma.songbook.deleteMany({ where: { ownerId: testUserId } });
    await prisma.song.deleteMany({ where: { ownerId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  describe("generateSongbookPdf", () => {
    it.skip("generates a PDF for a songbook with songs", async () => {
      const result = await generateSongbookPdf(testSongbookId);

      expect(result.pdfPath).toContain(".pdf");
      expect(result.logPath).toContain(".log");
    });
  });
});
