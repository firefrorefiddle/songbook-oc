import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { prisma } from "$lib/server/prisma";

export const GET: RequestHandler = async ({ params, url }) => {
  const versionId = url.searchParams.get("versionId") || undefined;

  const songbook = await prisma.songbook.findUnique({
    where: { id: params.id },
    include: {
      versions: {
        where: versionId ? { id: versionId } : {},
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!songbook || songbook.versions.length === 0) {
    throw error(404, "Songbook version not found");
  }

  const version = songbook.versions[0];

  if (!version.pdfLogPath || !existsSync(version.pdfLogPath)) {
    throw error(404, "No log available - have you generated a PDF yet?");
  }

  try {
    const logContent = await readFile(version.pdfLogPath, "utf-8");

    return new Response(logContent, {
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    throw error(500, message);
  }
};
