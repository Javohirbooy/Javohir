import { parseNumberedUzMcqDocument } from "@/lib/ayugram-mcq-parse";
import { ommlXmlToMarkdownMath } from "@/lib/docx-omml-to-latex";

type JSZipType = typeof import("jszip");

async function loadZip(buf: Buffer) {
  const JSZip = (await import("jszip")).default as JSZipType;
  return JSZip.loadAsync(buf);
}

async function loadDocumentRels(zip: Awaited<ReturnType<typeof loadZip>>): Promise<Record<string, string>> {
  const relsXml = (await zip.file("word/_rels/document.xml.rels")?.async("string")) ?? "";
  const map: Record<string, string> = {};
  for (const m of relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    map[m[1]!] = m[2]!;
  }
  return map;
}

async function imagesMarkdownFromParagraph(
  pXml: string,
  zip: Awaited<ReturnType<typeof loadZip>>,
  rels: Record<string, string>,
): Promise<string> {
  const embeds = [...pXml.matchAll(/r:embed="(rId\d+)"/g)].map((m) => m[1]!);
  const parts: string[] = [];
  for (const rid of embeds) {
    const target = rels[rid];
    if (!target) continue;
    const mediaPath = target.replace(/^\.\.\//, "");
    const fullPath = mediaPath.startsWith("word/") ? mediaPath : `word/${mediaPath}`;
    const file = zip.file(fullPath);
    if (!file) continue;
    const b64 = await file.async("base64");
    const ext = fullPath.split(".").pop()?.toLowerCase() ?? "png";
    const mime =
      ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "gif"
          ? "image/gif"
          : "image/png";
    parts.push(`![](data:${mime};base64,${b64})`);
  }
  return parts.join(" ");
}

function decodeWordText(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** `<w:t>` ochilishini topadi; `<w:tabs>` bilan chalkashmaydi. */
function findWtOpen(xml: string, from: number): number {
  const re = /<w:t(?:\s[^>]*)?>|<w:t>/g;
  re.lastIndex = from;
  const m = re.exec(xml);
  return m ? m.index : -1;
}

function cleanExtractedLine(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/<\/w:[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** `24 B) 27` / `7 B) 10` → `A) 24 B) 27` */
function normalizeLeadingOptionLine(line: string): string {
  let t = line.trim().replace(/([A-D])）/gi, "$1)");
  if (!/\bA\)\s/i.test(t) && /\bB\)\s/i.test(t)) {
    const m = t.match(/^(\d+)\s+B\)/i);
    if (m) t = `A) ${m[1]} ${t.slice(m[0].length).trim()}`;
  }
  // DOCX XML: `A) 24 27 C) 36` — B) yo‘qolgan
  t = t.replace(/\bA\)\s*(\d+)\s+(\d+)\s+C\)/i, "A) $1 B) $2 C)");
  return t;
}

/** One `<w:p>…</w:p>` → plain line with inline `$…$` math. */
export function wordParagraphXmlToLine(pXml: string): string {
  const parts: string[] = [];
  let pos = 0;
  const xml = pXml;

  while (pos < xml.length) {
    const wtIdx = findWtOpen(xml, pos);
    const omIdx = xml.indexOf("<m:oMath", pos);
    if (wtIdx === -1 && omIdx === -1) break;

    const next =
      wtIdx === -1 ? omIdx : omIdx === -1 ? wtIdx : Math.min(wtIdx, omIdx);

    if (next === wtIdx) {
      const openEnd = xml.indexOf(">", wtIdx);
      const close = xml.indexOf("</w:t>", openEnd);
      if (close === -1) break;
      parts.push(decodeWordText(xml.slice(openEnd + 1, close)));
      pos = close + "</w:t>".length;
    } else {
      const close = xml.indexOf("</m:oMath>", omIdx);
      if (close === -1) break;
      const block = xml.slice(omIdx, close + "</m:oMath>".length);
      const math = ommlXmlToMarkdownMath(block);
      if (math) parts.push(math);
      pos = close + "</m:oMath>".length;
    }
  }

  return cleanExtractedLine(parts.join(""));
}

/**
 * DOCX `word/document.xml` → numbered MCQ plain text (OMML → `$…$` LaTeX).
 */
export async function docxBufferToMcqPlainText(buf: Buffer): Promise<string> {
  const zip = await loadZip(buf);
  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) throw new Error("DOCX: word/document.xml topilmadi");
  const rels = await loadDocumentRels(zip);

  const paragraphs = [...docXml.matchAll(/<w:p[\s\S]*?<\/w:p>/g)].map((m) => m[0]!);
  const built: string[] = [];
  for (const p of paragraphs) {
    let line = wordParagraphXmlToLine(p);
    const imgs = await imagesMarkdownFromParagraph(p, zip, rels);
    if (imgs && !line) line = imgs;
    else if (imgs) line = `${line} ${imgs}`;
    if (line.length > 0) built.push(line);
  }
  return built
    .map((l) =>
      l
        .replace(/\s*(?:Oson|O’rtacha qiyin|Qiyin)\s*\(\d+\s*-\s*\d+\)\s*$/gi, "")
        .trim(),
    )
    .map(normalizeLeadingOptionLine)
    .filter((l) => l.length > 0)
    .join("\n");
}

/** Variant tanasidan `T` / `J` javob jadvali va sarlavha qatorlarini olib tashlaydi. */
export function stripEmbeddedUzAnswerKeyFromBody(body: string): string {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inKey = false;
  let sawQ30 = false;

  for (const raw of lines) {
    const t = raw.trim();
    if (/^30[.,]/.test(t)) sawQ30 = true;
    if (sawQ30 && /^T$/i.test(t)) {
      inKey = true;
      continue;
    }
    if (inKey) {
      if (/^[1-9]\d*\.\s/.test(t) || /^\d+-sinf\./i.test(t)) inKey = false;
      else continue;
    }
    if (/^F\.I\.Sh\b/i.test(t)) continue;
    if (/^\d+-sinf\.\s*$/i.test(t)) continue;
    if (/^variant\s*$/i.test(t)) continue;
    out.push(raw);
  }
  return out.join("\n").trim();
}

function stripLeadingGradeVariantHeader(body: string): string {
  return body
    .replace(/^[^\n]*\n(?=\d+-sinf\.?\s*\n)/i, "")
    .replace(/^\d+-sinf\.\s*\n\s*variant\s*\n/i, "")
    .replace(/^\d+-sinf\.?\s*\n/i, "")
    .trim();
}

/** `1-variant` / `2-variant` yoki `7-sinf` + `variant` takrori bo‘yicha ajratish. */
export function splitUzMathTestVariants(raw: string): { label: string; body: string }[] {
  const text = raw.replace(/\r\n/g, "\n");

  const numbered = text.split(/\n(?=[12]-variant\b)/i);
  if (numbered.length >= 2) {
    return numbered.map((body, i) => ({
      label: i === 0 ? "1-variant" : `${i + 1}-variant`,
      body: stripEmbeddedUzAnswerKeyFromBody(body.replace(/^[12]-variant\s*/i, "").trim()),
    }));
  }

  const gradeParts = text
    .split(/\n(?=\d+-sinf\.\s*\n\s*variant\s*\n)/i)
    .map((body) => stripEmbeddedUzAnswerKeyFromBody(stripLeadingGradeVariantHeader(body)))
    .filter((body) => /(?:^|\n)\s*1[.,]\s/.test(body));
  if (gradeParts.length >= 2) {
    return gradeParts.map((body, i) => ({
      label: `${i + 1}-variant`,
      body,
    }));
  }
  if (gradeParts.length === 1) {
    return [{ label: "1-variant", body: gradeParts[0]! }];
  }

  const single = stripLeadingGradeVariantHeader(text);
  if (single !== text.trim()) {
    return [{ label: "1-variant", body: stripEmbeddedUzAnswerKeyFromBody(single) }];
  }

  return [{ label: "1-variant", body: stripEmbeddedUzAnswerKeyFromBody(text) }];
}

export function numberedMcqToImportLines(
  questions: ReturnType<typeof parseNumberedUzMcqDocument>,
): string {
  return questions
    .map(
      (q, i) =>
        `${i + 1}. ${q.text}\nA) ${q.options[0]}\nB) ${q.options[1]}\nC) ${q.options[2]}\nD) ${q.options[3]}`,
    )
    .join("\n\n");
}

export async function docxBufferToImportMcqText(buf: Buffer): Promise<{
  mcqText: string;
  parserSource: string;
  usedOmml: boolean;
}> {
  const plain = await docxBufferToMcqPlainText(buf);
  const numbered = parseNumberedUzMcqDocument(plain);
  if (numbered.length > 0) {
    return {
      mcqText: numberedMcqToImportLines(numbered),
      parserSource: plain,
      usedOmml: true,
    };
  }
  const { docxBufferToMarkdown } = await import("@/lib/docx-to-markdown");
  const md = await docxBufferToMarkdown(buf);
  return { mcqText: md, parserSource: plain, usedOmml: false };
}
