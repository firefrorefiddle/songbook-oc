import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { generatePreview } from "$lib/server/songPreview";

function buildSongContent(
  title: string,
  content: string,
  copyright?: string,
): string {
  if (content.trim().startsWith("title:")) {
    return content;
  }
  let sngContent = `title: ${title}\n`;
  if (copyright?.trim()) {
    sngContent += `copyright: ${copyright}\n`;
  }
  sngContent += "***\n";
  sngContent += content;
  return sngContent;
}

export const POST: RequestHandler = async ({ request }) => {
  const { content, title, copyright } = await request.json();

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
      copyright,
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
