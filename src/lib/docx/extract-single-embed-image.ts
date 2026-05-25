import type JSZip from "jszip";

/** Bir `r:embed` uchun media fayl bufferi. */
export async function bufferFromDocxEmbed(
  zip: JSZip,
  rels: Record<string, string>,
  embedId: string,
): Promise<{ buf: Buffer; contentType: string } | null> {
  const target = rels[embedId];
  if (!target) return null;
  const mediaPath = target.replace(/^\.\.\//, "");
  const fullPath = mediaPath.startsWith("word/") ? mediaPath : `word/${mediaPath}`;
  const file = zip.file(fullPath);
  if (!file) return null;
  const buf = Buffer.from(await file.async("arraybuffer"));
  const ext = fullPath.split(".").pop()?.toLowerCase() ?? "png";
  const contentType =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "gif"
        ? "image/gif"
        : "image/png";
  return { buf, contentType };
}

export async function loadDocumentRels(zip: JSZip): Promise<Record<string, string>> {
  const relsXml = (await zip.file("word/_rels/document.xml.rels")?.async("string")) ?? "";
  const map: Record<string, string> = {};
  for (const m of relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    map[m[1]!] = m[2]!;
  }
  return map;
}

/** Variant 2 dagi 18-savol (kub rasmi) — `kublar` dan keyingi birinchi rasm. */
export async function extract7sinfV2Q18ImageBuffer(docxPath: string): Promise<{
  buf: Buffer;
  contentType: string;
} | null> {
  const fs = await import("node:fs");
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(fs.readFileSync(docxPath));
  const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";
  const rels = await loadDocumentRels(zip);

  const marker = `${7}-sinf`;
  const first = xml.indexOf(marker);
  const second = first >= 0 ? xml.indexOf(marker, first + marker.length) : -1;
  if (second < 0) return null;

  const slice = xml.slice(second);
  const kublar = slice.indexOf("kublar");
  if (kublar < 0) return null;

  const after = slice.slice(kublar, kublar + 20_000);
  const m = after.match(/r:embed="(rId\d+)"/);
  if (!m?.[1]) return null;

  return bufferFromDocxEmbed(zip, rels, m[1]);
}
