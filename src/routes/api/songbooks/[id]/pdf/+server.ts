import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { generateSongbookPdf } from "$lib/server/songbookPdf";
import { readFile } from "fs/promises";

export const GET: RequestHandler = async ({ params, url }) => {
  const versionId = url.searchParams.get("versionId") || undefined;

  try {
    const pdfPath = await generateSongbookPdf(params.id, versionId);
    const pdfBuffer = await readFile(pdfPath);

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="songbook-${params.id}.pdf"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    throw error(500, message);
  }
};
