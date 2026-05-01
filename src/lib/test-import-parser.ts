/**
 * Best-effort MCQ import from plain text.
 * Does not claim to support every document layout — always returns reviewable draft rows.
 *
 * Supported patterns (flexible):
 * - `1. Question` / `Q1:` blocks followed by `A) ...`–`H)` lines and optional `Answer: B`
 * - `? question` followed by `+ correct option` / `- incorrect option`
 * - Multiline questions (LaTeX `$$…$$`, formulas) — continuation lines use newline.
 * - Markdown: `$x^2$`, `![rasm](url)`, `![](data:...)`
 */

export type ParsedDraftQuestion = {
  text: string;
  options: string[];
  correctIndex: number | null;
  rawBlock: string;
};

function normalizeLines(text: string) {
  return text.replace(/\r\n/g, "\n").split("\n");
}

/** Qator boshidagi “javob belgisi”dan keyin bo‘shliq (DOCX markdown: \- 34, + 68). */
const LEADING_OPTION_MARK =
  /^(?:\\[-+]|\+|(?:(?<![\d,])(?:[\u2212\u2013-]))(?=\s))(?=\s|\d|\(|$)/;

/**
 * Tenglama / formula davomi — ichidagi +/− ni variant ajratuvchisi deb olmaslik kerak.
 */
function isEquationOrQuestionStemContinuation(parsed: string): boolean {
  const t = parsed.trim();
  if (!t) return false;
  const deQuote = t.replace(/^[\s>*_`'"]+/, "");
  const looksLikeOptionStart = LEADING_OPTION_MARK.test(deQuote);
  if (looksLikeOptionStart) return false;
  if (t.startsWith("(")) return true;
  if (t.includes("=") && t.length >= 6) return true;
  if (/^\d+\s*\(/.test(t)) return true;
  const semi = (t.match(/;/g) || []).length;
  if (semi >= 2 && !/^\+/.test(deQuote)) return true;
  return false;
}

function lineLooksLikeSignedOptionsRow(parsed: string): boolean {
  if (isEquationOrQuestionStemContinuation(parsed)) return false;
  const t = parsed.trim().replace(/^[\s>*_`'"]+/, "");
  if (!t) return false;
  if (/^\\?[-+]/.test(t)) return true;
  if (/^[\u2212\u2013]/.test(t) && /\s/.test(t)) return true;
  return false;
}

export function parseMcqTextToDraftQuestions(raw: string): ParsedDraftQuestion[] {
  const lines = normalizeLines(raw);
  const blocks: string[][] = [];
  let cur: string[] = [];

  const normalizeForParse = (l: string) => l.replace(/\\([+-])/g, "$1").replace(/\*\*/g, "").trim();
  const isQuestionStart = (l: string) =>
    /^(?:[>\-*_`\s]*\?\s*|[>\-*_`\s]*\d+[\).]|[>\-*_`\s]*Q\d*[:.)]|[>\-*_`\s]*\*\s*\d+[\).])/i.test(l);
  let seenQuestion = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const probe = normalizeForParse(line);
    if (!line.trim() && !cur.length) continue;
    if (isQuestionStart(probe) && cur.length) {
      blocks.push(cur);
      cur = [line];
      seenQuestion = true;
    } else if (isQuestionStart(probe) && !cur.length) {
      cur = [line];
      seenQuestion = true;
    } else if (seenQuestion) {
      cur.push(line);
    } else {
      // Ignore heading / intro before first question marker.
      continue;
    }
  }
  if (cur.length) blocks.push(cur);

  const out: ParsedDraftQuestion[] = [];

  for (const block of blocks) {
    const rawBlock = block.join("\n");
    const optLines: { text: string; isCorrect: boolean }[] = [];
    let questionText = "";
    let answerLetter: string | null = null;

    for (const line of block) {
      const parsed = normalizeForParse(line);
      if (!parsed) continue;

      if (!questionText && isQuestionStart(parsed)) {
        questionText = parsed.replace(/^(?:[>\-*_`\s]*\?\s*|[>\-*_`\s]*\d+[\).]|[>\-*_`\s]*Q\d*[:.)]|[>\-*_`\s]*\*\s*\d+[\).])\s*/i, "").trim();
        continue;
      }

      const ans = parsed.match(/^Answer\s*[:.)]\s*([A-Ha-h])\b/i);
      if (ans) {
        answerLetter = ans[1]!.toUpperCase();
        continue;
      }
      const opt = parsed.match(/^([A-Ha-h])[\).]\s+(.+)$/);
      if (opt) {
        optLines.push({ text: opt[2]!.trim(), isCorrect: false });
        continue;
      }
      // Preferred split for DOCX rows where options are arranged in columns.
      // We only treat +/- as option markers when they start line OR are preceded by 2+ spaces,
      // so math like `5 + 3` inside option text is preserved.
      if (lineLooksLikeSignedOptionsRow(parsed)) {
        const markerMatches = [...parsed.matchAll(/(?:^|\s{2,})([+-])\s*/g)];
        if (markerMatches.length >= 2) {
          for (let i = 0; i < markerMatches.length; i++) {
            const cur = markerMatches[i];
            const next = markerMatches[i + 1];
            const start = (cur.index ?? 0) + cur[0].length;
            const end = next ? next.index ?? parsed.length : parsed.length;
            const text = parsed.slice(start, end).trim();
            if (!text) continue;
            optLines.push({ text, isCorrect: cur[1] === "+" });
          }
          continue;
        }
        // Fallback: "+ A - B - C" in one line — faqat aniq variant qatori uchun.
        const signed = [...parsed.matchAll(/([+-])\s*([^+\-\n][^+\-]*?)(?=\s+[+-]\s*|$)/g)];
        if (signed.length >= 2) {
          for (const m of signed) {
            const text = m[2]?.trim();
            if (!text) continue;
            optLines.push({ text, isCorrect: m[1] === "+" });
          }
          continue;
        }
      }
      const t = parsed.trim();
      if (!t) continue;
      if (!questionText) {
        questionText = t.replace(/^(?:[>\-*_`\s]*\?\s*|[>\-*_`\s]*\d+[\).]|[>\-*_`\s]*Q\d*[:.)]|[>\-*_`\s]*\*\s*\d+[\).])\s*/i, "").trim();
      } else {
        questionText = `${questionText}\n${t}`;
      }
    }

    if (!questionText && optLines.length === 0) continue;

    const options = optLines.length >= 2 ? optLines.map((x) => x.text) : ["Variant A", "Variant B", "Variant C", "Variant D"];
    let correctIndex: number | null = null;
    if (answerLetter) {
      const idx = answerLetter.charCodeAt(0)! - "A".charCodeAt(0);
      if (idx >= 0 && idx < options.length) correctIndex = idx;
    } else {
      const signedIdx = optLines.findIndex((x) => x.isCorrect);
      if (signedIdx >= 0) correctIndex = signedIdx;
    }

    out.push({
      text: questionText || "Savol (import)",
      options: options.slice(0, 8),
      correctIndex,
      rawBlock,
    });
  }

  if (!out.length && raw.trim()) {
    out.push({
      text: "Import qismi",
      options: ["A", "B", "C", "D"],
      correctIndex: null,
      rawBlock: raw.slice(0, 4000),
    });
  }

  return out;
}
