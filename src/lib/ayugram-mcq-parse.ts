/**
 * AyuGram / DOCX-style ingliz tili MCQ matnlarini (bitta qatorda A) B) C) D)) platforma importi uchun ajratadi.
 */

export type AyugramParsedQuestion = {
  text: string;
  options: [string, string, string, string];
};

/** GRADE n – VARIANT m, 6-SINF — VARIANT 1, yoki `2-variant` / `1-variant`. */
const VARIANT_HEADER =
  /^(?:GRADE\s+\d+.*(?:VARIANT|variant)\s*\d+|(?:\d+)-SINF.*(?:VARIANT|variant)\s*\d+|[12]-variant)\s*$/i;

function normalizeSpaces(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

/** DOCX: `goB) goes` yoki `friend.A)` — markerlardan oldin bo‘shliq. */
function spaceOutGluedMcqMarkers(line: string): string {
  let s = line;
  s = s.replace(/([0-9])([A-D]\))/gi, "$1 $2");
  s = s.replace(/([A-D]\))([A-Za-z(])/gi, "$1 $2");
  s = s.replace(/([a-z0-9'’)\]])\s*([B-D]\))/gi, "$1 $2");
  s = s.replace(/(\.)\s*([A-D]\))/gi, "$1 $2");
  return s;
}

/** Variantlar alohida qatorlarda bo‘lsa (`A)…` / `B)…`) bitta qatorga yig‘iladi. */
export function mergeSplitMcqOptionLines(lines: string[]): string[] {
  const out: string[] = [];
  let optBuf: string[] = [];
  const isOptLine = (l: string) => /^\s*[A-D]\)\s*/i.test(l.trim());

  const flushOpts = () => {
    if (optBuf.length) {
      out.push(optBuf.join(" "));
      optBuf = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushOpts();
      continue;
    }
    if (isOptLine(line)) {
      optBuf.push(line.trim());
    } else {
      flushOpts();
      out.push(line);
    }
  }
  flushOpts();
  return out;
}

/** "A) x B) y ..." yoki yopishgan variantlar (oldindan {@link spaceOutGluedMcqMarkers}). */
export function extractFourOptionsFromSegment(segment: string): string[] | null {
  const line = normalizeSpaces(spaceOutGluedMcqMarkers(segment));
  const matches = [...line.matchAll(/\b([A-D])\)\s*/gi)];
  if (matches.length < 4) return null;
  const texts: string[] = [];
  for (let i = 0; i < 4; i++) {
    const m = matches[i]!;
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1]!.index ?? line.length) : line.length;
    const t = line.slice(start, end).trim();
    if (!t) return null;
    texts.push(t);
  }
  return texts;
}

/** Variant bo‘limi: bir savol bir yoki bir necha qator, keyin A) bilan boshlangan variant qatori. */
export function parseStemThenInlineOptions(lines: string[]): AyugramParsedQuestion[] {
  const out: AyugramParsedQuestion[] = [];
  const stemParts: string[] = [];

  const flushStem = (extraStemLine: string) => {
    const parts = stemParts.map((x) => spaceOutGluedMcqMarkers(x.trim()));
    if (extraStemLine) parts.push(extraStemLine);
    return normalizeSpaces(parts.join(" "));
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const spaced = spaceOutGluedMcqMarkers(line);
    const optIdx = spaced.search(/\b[A-D]\)\s*/i);
    if (optIdx >= 0) {
      const stemTail = spaced.slice(0, optIdx).trim();
      const optSeg = spaced.slice(optIdx);
      const stem = flushStem(stemTail);
      const opts = extractFourOptionsFromSegment(optSeg);
      if (opts && opts.length === 4 && stem) {
        out.push({ text: stem, options: opts as [string, string, string, string] });
      }
      stemParts.length = 0;
    } else {
      stemParts.push(line);
    }
  }

  return out;
}

export function splitImtihonVariants(raw: string): { label: string; bodyLines: string[] }[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const variants: { label: string; bodyLines: string[] }[] = [];
  let current: { label: string; bodyLines: string[] } | null = null;

  for (const line of lines) {
    const t = line.trim();
    if (VARIANT_HEADER.test(t)) {
      current = { label: t, bodyLines: [] };
      variants.push(current);
      continue;
    }
    if (current) current.bodyLines.push(line);
  }

  return variants.filter((v) => v.bodyLines.some((l) => l.trim()));
}

export function parseAnswerKeyByGrade(raw: string): Map<number, string[]> {
  const map = new Map<number, string[]>();
  const parts = raw.split(/ANSWER KEY\s*[—-]\s*GRADE\s*(\d+)/i);
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const gradeNum = Number(parts[i]);
    const body = parts[i + 1] ?? "";
    const letters = body
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => /^[A-D]$/i.test(l))
      .map((l) => l.toUpperCase());
    if (Number.isFinite(gradeNum) && letters.length) map.set(gradeNum, letters);
  }
  return map;
}

export function lettersToIndices(letters: string[]): number[] {
  return letters.map((ch) => Math.min(3, Math.max(0, ch.charCodeAt(0) - "A".charCodeAt(0))));
}

/** "Grade 7" sarlavhasini tashlab, birinchi `1.` savol qatoridan boshlaydi. */
export function stripUntilFirstNumberedQuestion(lines: string[]): string[] {
  const idx = lines.findIndex((l) => /^\d+\./.test(l.trim()));
  return idx >= 0 ? lines.slice(idx) : lines;
}

/** Javoblar: har qatorda bitta A–D yoki ketma-ket `AAABCB…` qatori. */
export function parseCompactLetterAnswerKey(raw: string): string[] {
  const perLine = raw
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => /^[A-D]$/i.test(l))
    .map((l) => l.toUpperCase());
  if (perLine.length > 0) return perLine;

  const compact = raw
    .replace(/(?:^|\n)\s*\d[\s-]*variant\s*/gi, "")
    .replace(/\s+/g, "")
    .toUpperCase();
  const letters = compact.match(/[A-D]/g);
  return letters ?? [];
}

/** `1.` … `30.` yoki `10 Oybek` (nuqta yo‘q); `17 =` kabi mantiq qatorlari emas. */
const NUMBERED_QUESTION_START =
  /^(?:(?:[1-9][.,]\s*)|(?:[12]\d|30)(?:[.,]\s*|\s+(?=[A-Za-z"'(ЁёҒғЎўҚқҲҳ])))/;

/** `1.` `2.` … bilan boshlangan savol bloklari (matematika testlari). */
export function splitNumberedQuestionBlocks(raw: string): string[][] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[][] = [];
  let current: string[] | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      if (current) current.push("");
      continue;
    }
  /** `3, 4, 4…` ketma-ketlik — yangi savol emas */
    const isSequenceContinuation = /^\d+,\s*\d/.test(trimmed);
    if (!isSequenceContinuation && NUMBERED_QUESTION_START.test(trimmed)) {
      if (current?.length) blocks.push(current);
      current = [line];
    } else if (current) {
      current.push(line);
    }
  }
  if (current?.length) blocks.push(current);
  return blocks;
}

function stripLeadingQuestionNumber(s: string): string {
  return normalizeSpaces(s.replace(NUMBERED_QUESTION_START, ""));
}

function extractFourOptionsAllowEmpty(segment: string): string[] | null {
  const line = normalizeSpaces(spaceOutGluedMcqMarkers(segment));
  const matches = [...line.matchAll(/\b([A-D])\)\s*/gi)];
  if (matches.length < 4) return null;
  const texts: string[] = [];
  for (let i = 0; i < 4; i++) {
    const m = matches[i]!;
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1]!.index ?? line.length) : line.length;
    const t = line.slice(start, end).trim();
    texts.push(t || `(${m[1]!.toUpperCase()})`);
  }
  return texts;
}

function parseNumberedBlock(blockLines: string[]): AyugramParsedQuestion | null {
  const nonEmpty = blockLines.filter((l) => l.trim());
  if (!nonEmpty.length) return null;

  const lines = nonEmpty.map((l, i) =>
    i === 0 ? l.replace(NUMBERED_QUESTION_START, "") : l,
  );
  const parsed = parseStemThenInlineOptions(lines);
  if (parsed.length === 1) {
    return {
      text: stripLeadingQuestionNumber(parsed[0]!.text),
      options: parsed[0]!.options,
    };
  }

  const imageOpts = nonEmpty
    .map((l) => l.trim())
    .filter((l) => /^!\[/ .test(l));
  if (imageOpts.length >= 1) {
    const stem = stripLeadingQuestionNumber(
      normalizeSpaces(
        nonEmpty
          .filter((l) => !/^!\[/.test(l.trim()))
          .join(" "),
      ),
    );
    if (!stem) return null;
    if (imageOpts.length >= 4) {
      return {
        text: stem,
        options: imageOpts.slice(0, 4) as [string, string, string, string],
      };
    }
    return {
      text: [stem, ...imageOpts].join("\n\n"),
      options: ["A", "B", "C", "D"],
    };
  }

  const joined = normalizeSpaces(lines.join(" "));
  const optIdx = joined.search(/\b[A-D]\)\s*/i);
  if (optIdx < 0) return null;

  const stem = stripLeadingQuestionNumber(joined.slice(0, optIdx));
  const optSeg = joined.slice(optIdx);
  const opts =
    extractFourOptionsAllowEmpty(optSeg) ?? extractFourOptionsFromSegment(optSeg);
  if (!opts || !stem) return null;

  return { text: stem, options: opts as [string, string, string, string] };
}

/**
 * O‘zbekcha matematika testi: `1.` … `30.` raqamlari matndan olib tashlanadi.
 */
export function parseNumberedUzMcqDocument(raw: string): AyugramParsedQuestion[] {
  const merged = mergeSplitMcqOptionLines(raw.replace(/\r\n/g, "\n").split("\n")).join("\n");
  const out: AyugramParsedQuestion[] = [];
  for (const block of splitNumberedQuestionBlocks(merged)) {
    const q = parseNumberedBlock(block);
    if (q) out.push(q);
  }
  return out;
}
