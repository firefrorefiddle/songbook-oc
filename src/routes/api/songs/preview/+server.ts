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
  const { content, title, author, metadata } = await request.json();

  if (!content?.trim()) {
    return json({ error: "Content is required" }, { status: 400 });
  }

  if (!title?.trim()) {
    if (!content.trim().startsWith("title:")) {
      return json({ error: "Title is required for preview" }, { status: 400 });
    }
  }

  try {
    const sngContent = buildSongContent(
      title || "Untitled",
      content,
      author,
      metadata,
    );
    const pngBase64 = await generatePreview(sngContent);
    return json({ png: pngBase64 });
  } catch (error) {
    console.error("Preview generation error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return json(
      { error: "Failed to generate preview", details: message },
      { status: 500 },
    );
  }
};
