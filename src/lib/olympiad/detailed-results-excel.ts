import type { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import {
  bundleGradeSectionKey,
  canonicalBundleGradeSectionHeading,
  sortBundleGradeSectionKeys,
} from "@/lib/olympiad/bundle-grade-section";
import {
  buildQuestionAnswerExportRows,
  buildQuestionBankFromTest,
  summarizeQuestionRows,
  type QuestionAnswerExportRow,
  type QuestionBankRow,
} from "@/lib/olympiad/export-question-details";
import { olympiadResultToPoints } from "@/lib/olympiad/result-points";
import { prisma } from "@/lib/prisma";

const MAX_EXPORT_ROWS = 5000;

export type DetailedExportFilters = {
  olympiadId?: string;
  gradeLabel?: string;
  school?: string;
  name?: string;
};

export type DetailedExportAccess = {
  role: string;
  userId: string;
};

export type DetailedStudentExportRow = {
  gradeLabel: string;
  gradeSectionKey: string;
  firstName: string;
  lastName: string;
  schoolName: string;
  olympiadTitle: string;
  earnedPoints: number;
  maxPoints: number;
  percent: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  correctQuestionNumbers: string;
  wrongQuestionNumbers: string;
  wrongDetails: string;
  questionDetails: QuestionAnswerExportRow[];
};

function clampFilter(s: string | undefined, max = 200): string {
  const t = (s ?? "").trim();
  return t.length > max ? t.slice(0, max) : t;
}

function buildWhere(
  access: DetailedExportAccess,
  filters: DetailedExportFilters,
): Prisma.OlympiadResultWhereInput {
  const participantWhere: Prisma.OlympiadParticipantWhereInput = {};
  const g = clampFilter(filters.gradeLabel);
  const s = clampFilter(filters.school);
  const n = clampFilter(filters.name);
  if (g) participantWhere.gradeLabel = { contains: g, mode: "insensitive" };
  if (s) participantWhere.schoolName = { contains: s, mode: "insensitive" };
  if (n) {
    participantWhere.OR = [
      { firstName: { contains: n, mode: "insensitive" } },
      { lastName: { contains: n, mode: "insensitive" } },
    ];
  }

  const where: Prisma.OlympiadResultWhereInput = {
    session: { status: "FINALIZED", bundleAttemptId: null },
  };
  const oid = clampFilter(filters.olympiadId);
  if (oid) where.olympiadId = oid;
  if (access.role === "TEACHER") {
    where.olympiad = {
      OR: [{ createdByUserId: access.userId }, { responsibleUserId: access.userId }],
    };
  }
  if (Object.keys(participantWhere).length) where.participant = participantWhere;
  return where;
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

export function analyzeResultToExportRow(input: {
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
  participant: { firstName: string; lastName: string; gradeLabel: string; schoolName: string };
  olympiadTitle: string;
  score: number | null;
  maxScore: number | null;
}): DetailedStudentExportRow | null {
  const displayAnswers =
    parseAnswersJson(input.answersJson) ?? parseAnswersJson(input.attemptAnswersJson);
  if (!displayAnswers || !input.questionOrderJson) return null;

  let order: string[];
  let perms: Record<string, number[]>;
  try {
    order = JSON.parse(input.questionOrderJson) as string[];
    perms = JSON.parse(input.optionPermutationsJson ?? "{}") as Record<string, number[]>;
  } catch {
    return null;
  }
  if (!order.length) return null;

  const questionDetails = buildQuestionAnswerExportRows({
    answersJson: input.answersJson,
    attemptAnswersJson: input.attemptAnswersJson,
    questionOrderJson: input.questionOrderJson,
    optionPermutationsJson: input.optionPermutationsJson,
    questions: input.questions,
  });
  if (!questionDetails.length) return null;

  const summary = summarizeQuestionRows(questionDetails);
  const pts = olympiadResultToPoints(input.score, input.maxScore);
  const earned = questionDetails.reduce((a, r) => a + r.earnedPoints, 0);
  const max = questionDetails.reduce((a, r) => a + r.maxPoints, 0);
  const correctCount = questionDetails.filter((r) => r.verdict === "To'g'ri").length;
  const answeredCount = questionDetails.filter((r) => r.verdict !== "Javobsiz").length;

  return {
    gradeLabel: input.participant.gradeLabel,
    gradeSectionKey: bundleGradeSectionKey(input.participant.gradeLabel),
    firstName: input.participant.firstName,
    lastName: input.participant.lastName,
    schoolName: input.participant.schoolName,
    olympiadTitle: input.olympiadTitle,
    earnedPoints: earned,
    maxPoints: max,
    percent: pts.percent,
    correctCount,
    wrongCount: answeredCount - correctCount,
    unansweredCount: questionDetails.length - answeredCount,
    correctQuestionNumbers: summary.correctQuestionNumbers,
    wrongQuestionNumbers: summary.wrongQuestionNumbers,
    wrongDetails: summary.wrongDetails,
    questionDetails,
  };
}

type QuestionSelect = {
  id: string;
  text: string;
  optionsJson: string;
  correctIndex: number;
  points: number | null;
};

async function loadOlympiadQuestionBank(
  access: DetailedExportAccess,
  olympiadId: string,
): Promise<QuestionBankRow[]> {
  const where: Prisma.OlympiadWhereInput = { id: olympiadId };
  if (access.role === "TEACHER") {
    where.OR = [{ createdByUserId: access.userId }, { responsibleUserId: access.userId }];
  }
  const o = await prisma.olympiad.findFirst({
    where,
    select: {
      title: true,
      test: {
        select: {
          questions: {
            orderBy: { order: "asc" },
            select: { text: true, optionsJson: true, correctIndex: true },
          },
        },
      },
    },
  });
  if (!o) return [];
  return buildQuestionBankFromTest(o.title, o.test.questions);
}

export async function fetchDetailedOlympiadExportData(
  access: DetailedExportAccess,
  filters: DetailedExportFilters,
): Promise<{ students: DetailedStudentExportRow[]; questionBanks: QuestionBankRow[] }> {
  const where = buildWhere(access, filters);
  const raw = await prisma.olympiadResult.findMany({
    where,
    orderBy: [{ score: "desc" }, { id: "asc" }],
    take: MAX_EXPORT_ROWS,
    select: {
      score: true,
      maxScore: true,
      answersJson: true,
      participant: {
        select: { firstName: true, lastName: true, gradeLabel: true, schoolName: true },
      },
      olympiad: {
        select: {
          id: true,
          title: true,
          test: {
            select: {
              questions: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  text: true,
                  optionsJson: true,
                  correctIndex: true,
                  points: true,
                },
              },
            },
          },
        },
      },
      session: {
        select: {
          attempt: {
            select: {
              questionOrderJson: true,
              optionPermutationsJson: true,
              answersJson: true,
            },
          },
        },
      },
    },
  });

  const students: DetailedStudentExportRow[] = [];
  const bankByOlympiad = new Map<string, QuestionBankRow[]>();

  for (const r of raw) {
    const attempt = r.session.attempt;
    if (!attempt) continue;
    const row = analyzeResultToExportRow({
      answersJson: r.answersJson,
      attemptAnswersJson: attempt.answersJson,
      questionOrderJson: attempt.questionOrderJson,
      optionPermutationsJson: attempt.optionPermutationsJson,
      questions: r.olympiad.test.questions,
      participant: r.participant,
      olympiadTitle: r.olympiad.title,
      score: r.score,
      maxScore: r.maxScore,
    });
    if (row) students.push(row);

    if (!bankByOlympiad.has(r.olympiad.id)) {
      bankByOlympiad.set(
        r.olympiad.id,
        buildQuestionBankFromTest(r.olympiad.title, r.olympiad.test.questions),
      );
    }
  }

  const oid = clampFilter(filters.olympiadId);
  let questionBanks: QuestionBankRow[];
  if (oid) {
    questionBanks = await loadOlympiadQuestionBank(access, oid);
    if (!questionBanks.length) {
      questionBanks = bankByOlympiad.get(oid) ?? [];
    }
  } else {
    questionBanks = [...bankByOlympiad.values()].flat();
  }

  return { students, questionBanks };
}

/** @deprecated Use fetchDetailedOlympiadExportData */
export async function fetchDetailedOlympiadExportRows(
  access: DetailedExportAccess,
  filters: DetailedExportFilters,
): Promise<DetailedStudentExportRow[]> {
  const { students } = await fetchDetailedOlympiadExportData(access, filters);
  return students;
}

function safeSheetName(gradeKey: string, suffix: string): string {
  const base = canonicalBundleGradeSectionHeading(gradeKey).replace(/[\\/?*[\]:]/g, " ");
  const name = `${base} — ${suffix}`.trim();
  return name.length > 31 ? name.slice(0, 31) : name;
}

function buildGradeSummarySheet(students: DetailedStudentExportRow[]): (string | number)[][] {
  const sorted = [...students].sort((a, b) => {
    if (b.earnedPoints !== a.earnedPoints) return b.earnedPoints - a.earnedPoints;
    return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "uz");
  });

  const header = [
    "O'rin",
    "Familiya",
    "Ism",
    "Sinf",
    "Maktab",
    "Olimpiada",
    "Ball",
    "Maks",
    "Foiz %",
    "To'g'ri",
    "Xato",
    "Javobsiz",
    "To'g'ri savollar (№)",
    "Xato savollar (№)",
    "Xato tafsilot",
  ];
  const rows: (string | number)[][] = [header];

  sorted.forEach((s, idx) => {
    rows.push([
      idx + 1,
      s.lastName,
      s.firstName,
      s.gradeLabel,
      s.schoolName,
      s.olympiadTitle,
      s.earnedPoints,
      s.maxPoints,
      s.percent,
      s.correctCount,
      s.wrongCount,
      s.unansweredCount,
      s.correctQuestionNumbers || "—",
      s.wrongQuestionNumbers || "—",
      s.wrongDetails || "—",
    ]);
  });

  return rows;
}

function buildQuestionsSheet(banks: QuestionBankRow[]): (string | number)[][] {
  const header = ["Test / fan", "Savol №", "Savol matni", "A", "B", "C", "D", "To'g'ri javob"];
  const rows: (string | number)[][] = [header];
  for (const q of banks) {
    rows.push([
      q.subjectTitle,
      q.questionNum,
      q.textPlain,
      q.optionA,
      q.optionB,
      q.optionC,
      q.optionD,
      q.correctLetter,
    ]);
  }
  return rows;
}

function buildAnswersSheet(students: DetailedStudentExportRow[]): (string | number)[][] {
  const header = [
    "Familiya",
    "Ism",
    "Sinf",
    "Maktab",
    "Olimpiada",
    "Savol №",
    "Savol matni",
    "A",
    "B",
    "C",
    "D",
    "Tanlangan",
    "To'g'ri javob",
    "Holat",
    "Ball",
    "Maks ball",
  ];
  const rows: (string | number)[][] = [header];

  const sorted = [...students].sort((a, b) => {
    if (b.earnedPoints !== a.earnedPoints) return b.earnedPoints - a.earnedPoints;
    return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "uz");
  });

  for (const s of sorted) {
    for (const q of s.questionDetails) {
      rows.push([
        s.lastName,
        s.firstName,
        s.gradeLabel,
        s.schoolName,
        s.olympiadTitle,
        q.questionNum,
        q.textPlain,
        q.optionA,
        q.optionB,
        q.optionC,
        q.optionD,
        q.selectedLetter,
        q.correctLetter,
        q.verdict,
        q.earnedPoints,
        q.maxPoints,
      ]);
    }
  }

  return rows;
}

/** Alohida olimpiada: har sinf uchun umumiy, savollar, javoblar. */
export function buildDetailedResultsWorkbook(
  students: DetailedStudentExportRow[],
  questionBanks: QuestionBankRow[],
): Buffer {
  const byGrade = new Map<string, DetailedStudentExportRow[]>();
  for (const s of students) {
    const list = byGrade.get(s.gradeSectionKey) ?? [];
    list.push(s);
    byGrade.set(s.gradeSectionKey, list);
  }

  const wb = XLSX.utils.book_new();
  const keys = sortBundleGradeSectionKeys(byGrade.keys());

  if (keys.length === 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Natija topilmadi"]]), "Bo'sh");
  } else {
    for (const key of keys) {
      const group = byGrade.get(key) ?? [];
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(buildGradeSummarySheet(group)),
        safeSheetName(key, "umumiy"),
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(buildQuestionsSheet(questionBanks)),
        safeSheetName(key, "savollar"),
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(buildAnswersSheet(group)),
        safeSheetName(key, "javoblar"),
      );
    }
  }

  const legend: (string | number)[][] = [
    ["Alohida olimpiada — Excel izoh"],
    ["Har sinf uchun 3 varaq: umumiy | savollar | javoblar"],
    ["umumiy", "Ball, to'g'ri va xato savollar ro'yxati"],
    ["savollar", "Savollar banki va to'g'ri javob"],
    ["javoblar", "Har talaba × savol: variantlar va holat"],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(legend), "Izoh");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function detailedResultsExcelFilename(olympiadTitle?: string, now = new Date()): string {
  const d = now.toISOString().slice(0, 10);
  const safe = (olympiadTitle ?? "olimpiada")
    .replace(/[^\w\u0400-\u04FF-]+/g, "-")
    .slice(0, 40);
  return `imtihon-tahlil-${safe}-${d}.xlsx`;
}
