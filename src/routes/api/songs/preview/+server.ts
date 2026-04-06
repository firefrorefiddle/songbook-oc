import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { generatePreview } from "$lib/server/songPreview";
import {
  buildSongContentForPdf,
  formatSongPdfPipelineIssues,
  validateSongPdfPipelineInput,
  type SongPdfPipelineMetadata,
} from "$lib/utils/songPdfPipelineSafety";

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { content, title, author, metadata, copyright } = body;

  if (!content?.trim()) {
    return json(
      { error: { stage: "validation", message: "Content is required" } },
      { status: 400 },
    );
  }

  if (!title?.trim()) {
    if (!content.trim().startsWith("title:")) {
      return json(
        {
          error: {
            stage: "validation",
            message: "Title is required for preview",
          },
        },
        { status: 400 },
      );
    }
  }

  const finalMetadata = metadata || (copyright ? { copyright } : undefined);

  const pipelineIssues = validateSongPdfPipelineInput({
    title: (title || "Untitled").trim(),
    author: author ?? "",
    content,
    metadata: finalMetadata as Record<string, string> | undefined,
  });
  if (pipelineIssues.length > 0) {
    return json(
      {
        error: {
          stage: "validation",
          message: formatSongPdfPipelineIssues(pipelineIssues),
        },
      },
      { status: 400 },
    );
  }

  const finalMetadataTyped = finalMetadata as SongPdfPipelineMetadata | undefined;

  try {
    const sngContent = buildSongContentForPdf(
      title || "Untitled",
      content,
      author,
      finalMetadataTyped,
    );
    const result = await generatePreview(sngContent);
    if (result.error) {
      return json({ error: result.error }, { status: 500 });
    }
    return json({ png: result.png });
  } catch (error) {
    console.error("Preview generation error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return json(
      { error: { stage: "unknown", message, logs: undefined } },
      { status: 500 },
    );
  }
};
