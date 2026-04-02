import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { generatePreview } from "$lib/server/songPreview";

interface SongMetadata {
  copyright?: string;
  reference?: string;
  extraIndex?: string;
  translationBy?: string;
  musicBy?: string;
  lyricsBy?: string;
}

function buildSongContent(
  title: string,
  content: string,
  author?: string,
  metadata?: SongMetadata,
): string {
  if (content.trim().startsWith("title:")) {
    return content;
  }
  let sngContent = `title: ${title}\n`;
  if (author?.trim()) {
    sngContent += `author: ${author}\n`;
  }
  if (metadata?.lyricsBy?.trim()) {
    sngContent += `lyricsBy: ${metadata.lyricsBy}\n`;
  }
  if (metadata?.musicBy?.trim()) {
    sngContent += `musicBy: ${metadata.musicBy}\n`;
  }
  if (metadata?.translationBy?.trim()) {
    sngContent += `translationBy: ${metadata.translationBy}\n`;
  }
  if (metadata?.copyright?.trim()) {
    sngContent += `copyright: ${metadata.copyright}\n`;
  }
  if (metadata?.reference?.trim()) {
    sngContent += `reference: ${metadata.reference}\n`;
  } else {
    sngContent += "reference:\n";
  }
  if (metadata?.extraIndex?.trim()) {
    sngContent += `extra-index: ${metadata.extraIndex}\n`;
  }
  sngContent += "***\n";
  sngContent += content;
  return sngContent;
}

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { content, title, author, metadata, copyright } = body;

  if (!content?.trim()) {
    return json({ error: "Content is required" }, { status: 400 });
  }

  if (!title?.trim()) {
    if (!content.trim().startsWith("title:")) {
      return json({ error: "Title is required for preview" }, { status: 400 });
    }
  }

  const finalMetadata = metadata || (copyright ? { copyright } : undefined);

  try {
    const sngContent = buildSongContent(
      title || "Untitled",
      content,
      author,
      finalMetadata,
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
