/**
 * Word OMML (Office Math ML) → LaTeX for remark-math / KaTeX.
 * Covers fractions, delimiters, and text runs used in AyuGram test DOCX files.
 */

function decodeXmlText(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

type OmmlNode = { tag: string; inner: string };

function isExactTagOpen(xml: string, pos: number, tag: string): boolean {
  const prefix = `<m:${tag}`;
  if (!xml.startsWith(prefix, pos)) return false;
  const next = xml[pos + prefix.length];
  return next === ">" || next === " " || next === "/";
}

function readOpenTag(xml: string, pos: number): { tag: string; len: number; selfClose: boolean } | null {
  const m = xml.slice(pos).match(/^<m:(\w+)([^>]*?)(\/?)>/);
  if (!m) return null;
  return { tag: m[1]!, len: m[0].length, selfClose: m[3] === "/" };
}

function findElementEnd(xml: string, tag: string, innerStart: number): number {
  const close = `</m:${tag}>`;
  let depth = 1;
  let i = innerStart;
  while (i < xml.length) {
    if (isExactTagOpen(xml, i, tag)) {
      const open = readOpenTag(xml, i);
      if (open && !open.selfClose) {
        depth++;
        i += open.len;
        continue;
      }
    }
    if (xml.startsWith(close, i)) {
      depth--;
      if (depth === 0) return i;
      i += close.length;
      continue;
    }
    i++;
  }
  return -1;
}

/** Parse direct `m:*` child elements (balanced tags). */
function parseOmmlChildren(xml: string): OmmlNode[] {
  const nodes: OmmlNode[] = [];
  let pos = 0;
  while (pos < xml.length) {
    const open = readOpenTag(xml, pos);
    if (!open) {
      pos++;
      continue;
    }
    if (open.selfClose) {
      nodes.push({ tag: open.tag, inner: "" });
      pos += open.len;
      continue;
    }
    const innerStart = pos + open.len;
    const closeStart = findElementEnd(xml, open.tag, innerStart);
    if (closeStart < 0) break;
    nodes.push({ tag: open.tag, inner: xml.slice(innerStart, closeStart) });
    pos = closeStart + `</m:${open.tag}>`.length;
  }
  return nodes;
}

function mapOmmlText(t: string): string {
  return decodeXmlText(t)
    .replace(/∙/g, " \\cdot ")
    .replace(/\s+/g, " ")
    .trim();
}

function ommlChildrenToLatex(xml: string): string {
  const parts = parseOmmlChildren(xml).map((n) => ommlNodeToLatex(n));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function ommlNodeToLatex(node: OmmlNode): string {
  const { tag, inner } = node;
  switch (tag) {
    case "r": {
      const texts = [...inner.matchAll(/<m:t[^>]*>([\s\S]*?)<\/m:t>/g)].map((m) =>
        mapOmmlText(m[1] ?? ""),
      );
      return texts.join("");
    }
    case "t":
      return mapOmmlText(inner);
    case "f": {
      const children = parseOmmlChildren(inner);
      const num = children.find((c) => c.tag === "num")?.inner ?? "";
      const den = children.find((c) => c.tag === "den")?.inner ?? "";
      return `\\frac{${ommlChildrenToLatex(num)}}{${ommlChildrenToLatex(den)}}`;
    }
    case "d": {
      const children = parseOmmlChildren(inner);
      const dPr = children.find((c) => c.tag === "dPr");
      const prXml = dPr?.inner ?? "";
      const beg = prXml.match(/<m:begChr[^>]*m:val="([^"]*)"/)?.[1] ?? "(";
      const end = prXml.match(/<m:endChr[^>]*m:val="([^"]*)"/)?.[1] ?? ")";
      const open = delimiterChar(beg, true);
      const close = delimiterChar(end, false);
      const eInners = children.filter((c) => c.tag === "e").map((c) => c.inner);
      const body =
        eInners.length > 0
          ? eInners.map((e) => ommlChildrenToLatex(e)).join("")
          : ommlChildrenToLatex(inner);
      if (open === "(" && close === ")") {
        return `\\left(${body}\\right)`;
      }
      return `${open}${body}${close}`;
    }
    case "e":
    case "num":
    case "den":
      return ommlChildrenToLatex(inner);
    default:
      return ommlChildrenToLatex(inner);
  }
}

function delimiterChar(ch: string, isOpen: boolean): string {
  if (!ch || ch === "?" || ch === "\uFFFC") {
    return isOpen ? "(" : ")";
  }
  if (ch === "|") return isOpen ? "\\left|" : "\\right|";
  if (ch === "{" || ch === "\u007B") return "\\{";
  if (ch === "}" || ch === "\u007D") return "\\}";
  return ch;
}

/** Full `<m:oMath>…</m:oMath>` block → inline LaTeX (no $ delimiters). */
export function ommlXmlToLatex(ommlXml: string): string {
  const inner = ommlXml.replace(/^<m:oMath[^>]*>/, "").replace(/<\/m:oMath>\s*$/, "");
  return ommlChildrenToLatex(inner);
}

/** Wrap for remark-math inline or display. */
export function ommlXmlToMarkdownMath(ommlXml: string, display = false): string {
  const latex = ommlXmlToLatex(ommlXml);
  if (!latex) return "";
  return display ? `$$${latex}$$` : `$${latex}$`;
}
