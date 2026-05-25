import { analyzeOlympiadAttemptAnswers } from "@/lib/olympiad/answer-analysis";
import { normalizeMcqQuestionWeight } from "@/lib/mcq/normalize-question-weight";

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export type QuestionAnswerExportRow = {
  questionNum: number;
  textPlain: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  selectedLetter: string;
  correctLetter: string;
  verdict: "To'g'ri" | "Xato" | "Javobsiz";
  earnedPoints: number;
  maxPoints: number;
};

export function plainTextForExcel(raw: string): string {
  return raw
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "[rasm]")
    .replace(/\$\$?[^$]+\$\$?/g, "[formula]")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function optionLetter(index: number): string {
  return index >= 0 && index < OPTION_LETTERS.length ? OPTION_LETTERS[index]! : "—";
}

function parseOptions(json: string): [string, string, string, string] {
  try {
    const arr = JSON.parse(json) as string[];
    return [
      plainTextForExcel(arr[0] ?? ""),
      plainTextForExcel(arr[1] ?? ""),
      plainTextForExcel(arr[2] ?? ""),
      plainTextForExcel(arr[3] ?? ""),
    ];
  } catch {
    return ["", "", "", ""];
  }
}

function parseAnswersJson(json: string | null | undefined): number[] | null {
  if (!json?.trim()) return null;
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.map((v) => (typeof v === "number" ? v : -1));
  } catch {
    return null;
  }
}

/** Bitta fan sessiyasi bo‘yicha har savol qatorlari (matn + variantlar + to‘g‘ri/xato). */
export function buildQuestionAnswerExportRows(input: {
  answersJson: string | null;
  attemptAnswersJson: string | null;
  questionOrderJson: string | null;
  optionPermutationsJson: string | null;
  questions: Array<{
    id: string;
    text: string;
    optionsJson: string;
    correctIndex: number;
    points: number | null;
  }>;
}): QuestionAnswerExportRow[] {
  const displayAnswers =
    parseAnswersJson(input.answersJson) ?? parseAnswersJson(input.attemptAnswersJson);
  if (!displayAnswers || !input.questionOrderJson) return [];

  let order: string[];
  let perms: Record<string, number[]>;
  try {
    order = JSON.parse(input.questionOrderJson) as string[];
    perms = JSON.parse(input.optionPermutationsJson ?? "{}") as Record<string, number[]>;
  } catch {
    return [];
  }

  const analyzed = analyzeOlympiadAttemptAnswers(
    order,
    perms,
    displayAnswers,
    input.questions.map((q) => ({
      id: q.id,
      text: q.text,
      optionsJson: q.optionsJson,
      correctIndex: q.correctIndex,
      points: q.points,
    })),
  );

  const byId = new Map(input.questions.map((q) => [q.id, q]));
  const rows: QuestionAnswerExportRow[] = [];

  for (let i = 0; i < order.length; i++) {
    const qid = order[i]!;
    const q = byId.get(qid);
    const row = analyzed.rows[i];
    if (!q || !row) continue;

    const opts = parseOptions(q.optionsJson);
    const maxPts = normalizeMcqQuestionWeight(q.points);
    const correctLetter = optionLetter(q.correctIndex);

    if (!row.answered) {
      rows.push({
        questionNum: i + 1,
        textPlain: plainTextForExcel(q.text),
        optionA: opts[0],
        optionB: opts[1],
        optionC: opts[2],
        optionD: opts[3],
        selectedLetter: "—",
        correctLetter,
        verdict: "Javobsiz",
        earnedPoints: 0,
        maxPoints: maxPts,
      });
      continue;
    }

    const selectedLetter = optionLetter(row.userCanonicalIndex);
    rows.push({
      questionNum: i + 1,
      textPlain: plainTextForExcel(q.text),
      optionA: opts[0],
      optionB: opts[1],
      optionC: opts[2],
      optionD: opts[3],
      selectedLetter,
      correctLetter,
      verdict: row.correct ? "To'g'ri" : "Xato",
      earnedPoints: row.earnedPoints,
      maxPoints: row.maxPoints,
    });
  }

  return rows;
}

export type QuestionBankRow = {
  subjectTitle: string;
  questionNum: number;
  textPlain: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctLetter: string;
};

/** Test savollar banki (eksport «savollar» varag‘i uchun). */
export function buildQuestionBankFromTest(
  subjectTitle: string,
  questions: Array<{ text: string; optionsJson: string; correctIndex: number }>,
): QuestionBankRow[] {
  return questions.map((q, i) => {
    const opts = parseOptions(q.optionsJson);
    return {
      subjectTitle,
      questionNum: i + 1,
      textPlain: plainTextForExcel(q.text),
      optionA: opts[0],
      optionB: opts[1],
      optionC: opts[2],
      optionD: opts[3],
      correctLetter: optionLetter(q.correctIndex),
    };
  });
}

export function summarizeQuestionRows(rows: QuestionAnswerExportRow[]): {
  correctQuestionNumbers: string;
  wrongQuestionNumbers: string;
  wrongDetails: string;
} {
  const correctNums: number[] = [];
  const wrongNums: number[] = [];
  const wrongParts: string[] = [];

  for (const r of rows) {
    if (r.verdict === "To'g'ri") correctNums.push(r.questionNum);
    if (r.verdict === "Xato") {
      wrongNums.push(r.questionNum);
      wrongParts.push(`${r.questionNum}(${r.selectedLetter}→${r.correctLetter})`);
    }
  }

  return {
    correctQuestionNumbers: correctNums.join(", "),
    wrongQuestionNumbers: wrongNums.join(", "),
    wrongDetails: wrongParts.join("; "),
  };
}
