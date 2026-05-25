import type JSZip from "jszip";
import { bufferFromDocxEmbed, loadDocumentRels } from "@/lib/docx/extract-single-embed-image";

export async function loadDocxZip(buf: Buffer) {
  const JSZip = (await import("jszip")).default;
  return JSZip.loadAsync(buf);
}

export function variantXmlSlice(docXml: string, gradeNumber: number, variantIndex: 0 | 1): string {
  const marker = `${gradeNumber}-sinf`;
  const first = docXml.indexOf(marker);
  if (first < 0) return docXml;
  if (variantIndex === 0) {
    const second = docXml.indexOf(marker, first + marker.length);
    return second >= 0 ? docXml.slice(first, second) : docXml.slice(first);
  }
  const second = docXml.indexOf(marker, first + marker.length);
  return second >= 0 ? docXml.slice(second) : "";
}

/** XML kesimidagi barcha `r:embed` rasmlarini tartibda. */
export async function extractEmbedBuffersInXml(
  zip: JSZip,
  xmlSlice: string,
): Promise<{ buf: Buffer; contentType: string; embedId: string }[]> {
  const rels = await loadDocumentRels(zip);
  const seen = new Set<string>();
  const out: { buf: Buffer; contentType: string; embedId: string }[] = [];
  for (const m of xmlSlice.matchAll(/r:embed="(rId\d+)"/g)) {
    const id = m[1]!;
    if (seen.has(id)) continue;
    seen.add(id);
    const img = await bufferFromDocxEmbed(zip, rels, id);
    if (img) out.push({ ...img, embedId: id });
  }
  return out;
}

export function xmlSliceBetween(docXml: string, startNeedle: string, endNeedle: string): string {
  const start = docXml.indexOf(startNeedle);
  if (start < 0) return "";
  const end = endNeedle ? docXml.indexOf(endNeedle, start + startNeedle.length) : docXml.length;
  return end >= 0 ? docXml.slice(start, end) : docXml.slice(start);
}
