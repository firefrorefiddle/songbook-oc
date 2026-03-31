import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { generateSongbookPdf } from "$lib/server/songbookPdf";

export const POST: RequestHandler = async ({ params, url }) => {
  const versionId = url.searchParams.get("versionId") || undefined;

  try {
    const result = await generateSongbookPdf(params.id, versionId);

    return new Response(
      JSON.stringify({
        pdfPath: result.pdfPath,
        logPath: result.logPath,
        message: "PDF generated successfully",
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    throw error(500, message);
  }
};
