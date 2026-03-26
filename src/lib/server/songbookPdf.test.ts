import { describe, it, expect, beforeAll } from "vitest";
import { generateSongbookPdf } from "./songbookPdf";
import { prisma } from "./prisma";

describe("songbookPdf", () => {
  let testSongbookId: string;
  let testSongIds: string[] = [];

  beforeAll(async () => {
    const song1 = await prisma.song.create({
      data: {
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

    testSongIds = [song1.id, song2.id];

    const songbook = await prisma.songbook.create({
      data: {
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

  describe("generateSongbookPdf", () => {
    it("generates a PDF for a songbook with songs", async () => {
      const pdfPath = await generateSongbookPdf(testSongbookId);

      expect(pdfPath).toContain(".pdf");
      expect(pdfPath).toContain(testSongbookId);
    });
  });
});
