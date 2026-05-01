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

  return turndown.turndown(htmlResult.value);
}
