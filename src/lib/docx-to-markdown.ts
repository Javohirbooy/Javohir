import TurndownService from "turndown";

/**
 * DOCX → HTML (inline images as data URIs) → Markdown for MCQ parser + rich preview.
 */
export async function docxBufferToMarkdown(buf: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const htmlResult = await mammoth.convertToHtml(
    { buffer: buf },
    {
      convertImage: mammoth.images.imgElement((image) =>
        image.readAsBase64String().then((b64) => ({
          src: `data:${image.contentType};base64,${b64}`,
        })),
      ),
    },
  );

  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });

  const md = turndown.turndown(htmlResult.value);
  // Turndown escapes ordered-list markers (`1\.`) — MCQ parser needs `1.`
  return md.replace(/^(\d+)\\\./gm, "$1.");
}
