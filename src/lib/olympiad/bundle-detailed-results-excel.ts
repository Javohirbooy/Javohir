import type { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { computeBundleAttemptPoints, sumQuestionMaxPoints } from "@/lib/olympiad/bundle-attempt-scoring";
import {
  bundleGradeSectionKey,
  canonicalBundleGradeSectionHeading,
  sortBundleGradeSectionKeys,
} from "@/lib/olympiad/bundle-grade-section";
import { bundleStudentDedupKey } from "@/lib/olympiad/bundle-student-key";
import { parseParticipantAssignedOlympiadIds } from "@/lib/olympiad/bundle-variant-assign";
import {
  buildQuestionAnswerExportRows,
  plainTextForExcel,
  summarizeQuestionRows,
  type QuestionAnswerExportRow,
} from "@/lib/olympiad/export-question-details";
import { isOlympiadExamTerminalStatus } from "@/lib/olympiad/exam-state-machine";
import { olympiadResultToPoints } from "@/lib/olympiad/result-points";
import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 2500;
const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export type BundleDetailedExportFilters = {
  bundleId?: string;
  gradeLabel?: string;
  school?: string;
  name?: string;
};

export type BundleDetailedExportAccess = {
  role: string;
  userId: string;
};

export type BundleSubjectColumn = {
  olympiadId: string;
  header: string;
  subjectTitle: string;
};

export type BundleSubjectCell = {
  earnedPoints: number | null;
  maxPoints: number | null;
  percent: number | null;
  correctQuestionNumbers: string;
  wrongQuestionNumbers: string;
  wrongDetails: string;
  status: "yakunlangan" | "boshlangan" | "kiritilmagan";
  questionDetails: QuestionAnswerExportRow[];
};

export type BundleStudentExportRow = {
  gradeLabel: string;
  gradeSectionKey: string;
  firstName: string;
  lastName: string;
  schoolName: string;
  bundleTitle: string;
  totalEarned: number;
  totalMax: number;
  totalPercent: number;
  completedSubjects: number;
  totalSubjects: number;
  allDone: boolean;
  subjectCells: Map<string, BundleSubjectCell>;
};

export type BundleQuestionBankRow = {
  subjectTitle: string;
  questionNum: number;
  textPlain: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctLetter: string;
};

type QuestionSelect = {
  id: string;
  text: string;
  optionsJson: string;
  correctIndex: number;
  points: number | null;
};

function clampFilter(s: string | undefined, max = 200): string {
  const t = (s ?? "").trim();
  return t.length > max ? t.slice(0, max) : t;
}

function subjectHeaderLabel(title: string, index: number): string {
  const short = title.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 24);
  return short ? `F${index + 1}: ${short}` : `Fan ${index + 1}`;
}

function optionLetter(index: number): string {
  return index >= 0 && index < OPTION_LETTERS.length ? OPTION_LETTERS[index]! : "—";
}

function parseOptionsForBank(json: string): [string, string, string, string] {
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

function buildQuestionBankRows(
  subjectTitle: string,
  questions: QuestionSelect[],
): BundleQuestionBankRow[] {
  return questions.map((q, i) => {
    const opts = parseOptionsForBank(q.optionsJson);
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

function buildWhere(
  access: BundleDetailedExportAccess,
  filters: BundleDetailedExportFilters,
): Prisma.OlympiadBundleAttemptWhereInput {
  const participantWhere: Prisma.OlympiadBundleParticipantWhereInput = {};
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

  const where: Prisma.OlympiadBundleAttemptWhereInput = {};
  const bid = clampFilter(filters.bundleId);
  if (bid) where.bundleId = bid;
  if (Object.keys(participantWhere).length) where.bundleParticipant = participantWhere;
  if (access.role === "TEACHER") {
    where.bundle = { createdById: access.userId };
  }
  return where;
}

function analyzeSessionToCell(input: {
  sessionStatus: string;
  result: {
    score: number | null;
    maxScore: number | null;
    answersJson: string | null;
  } | null;
  attempt: {
    questionOrderJson: string;
    optionPermutationsJson: string;
    answersJson: string | null;
  } | null;
  questions: QuestionSelect[];
}): BundleSubjectCell {
  const empty: BundleSubjectCell = {
    earnedPoints: null,
    maxPoints: null,
    percent: null,
    correctQuestionNumbers: "",
    wrongQuestionNumbers: "",
    wrongDetails: "",
    status: "kiritilmagan",
    questionDetails: [],
  };

  if (!isOlympiadExamTerminalStatus(input.sessionStatus) || !input.result || !input.attempt) {
    if (input.sessionStatus === "ACTIVE" || input.sessionStatus === "SUBMITTING") {
      return { ...empty, status: "boshlangan" };
    }
    return empty;
  }

  const questionDetails = buildQuestionAnswerExportRows({
    answersJson: input.result.answersJson,
    attemptAnswersJson: input.attempt.answersJson,
    questionOrderJson: input.attempt.questionOrderJson,
    optionPermutationsJson: input.attempt.optionPermutationsJson,
    questions: input.questions,
  });

  if (!questionDetails.length) {
    return empty;
  }

  const summary = summarizeQuestionRows(questionDetails);
  const pts = olympiadResultToPoints(input.result.score, input.result.maxScore);
  const earned = questionDetails.reduce((s, r) => s + r.earnedPoints, 0);
  const max = questionDetails.reduce((s, r) => s + r.maxPoints, 0);

  return {
    earnedPoints: earned,
    maxPoints: max,
    percent: pts.percent,
    correctQuestionNumbers: summary.correctQuestionNumbers,
    wrongQuestionNumbers: summary.wrongQuestionNumbers,
    wrongDetails: summary.wrongDetails,
    status: "yakunlangan",
    questionDetails,
  };
}

type BundleSubjectDef = {
  olympiadId: string;
  title: string;
  questions: QuestionSelect[];
};

async function loadBundleSubjectDefinitions(
  bundleId: string,
  access: BundleDetailedExportAccess,
): Promise<BundleSubjectDef[] | null> {
  const bundle = await prisma.olympiadBundle.findFirst({
    where: {
      id: bundleId,
      ...(access.role === "TEACHER" ? { createdById: access.userId } : {}),
    },
    select: {
      subjects: {
        orderBy: { orderIndex: "asc" },
        select: {
          titleOverride: true,
          olympiadId: true,
          olympiad: {
            select: {
              title: true,
              test: {
                select: {
                  title: true,
                  subject: { select: { title: true } },
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
        },
      },
    },
  });
  if (!bundle) return null;

  return bundle.subjects.map((sub) => {
    const title =
      sub.titleOverride ??
      sub.olympiad.test.subject?.title ??
      sub.olympiad.title ??
      sub.olympiad.test.title;
    return {
      olympiadId: sub.olympiadId,
      title,
      questions: sub.olympiad.test.questions,
    };
  });
}

export async function fetchBundleDetailedExportRows(
  access: BundleDetailedExportAccess,
  filters: BundleDetailedExportFilters,
): Promise<{
  students: BundleStudentExportRow[];
  subjectColumns: BundleSubjectColumn[];
  questionBanks: BundleQuestionBankRow[];
}> {
  const bundleIdFilter = clampFilter(filters.bundleId);
  const bundleDefs = bundleIdFilter
    ? await loadBundleSubjectDefinitions(bundleIdFilter, access)
    : null;

  const subjectColumns: BundleSubjectColumn[] = [];
  const questionBanks: BundleQuestionBankRow[] = [];

  if (bundleDefs) {
    bundleDefs.forEach((def, index) => {
      subjectColumns.push({
        olympiadId: def.olympiadId,
        header: subjectHeaderLabel(def.title, index),
        subjectTitle: def.title,
      });
      questionBanks.push(...buildQuestionBankRows(def.title, def.questions));
    });
  }

  const where = buildWhere(access, filters);

  const raw = await prisma.olympiadBundleAttempt.findMany({
    where,
    orderBy: [{ startedAt: "desc" }],
    take: MAX_ATTEMPTS,
    select: {
      id: true,
      bundleId: true,
      bundle: {
        select: {
          title: true,
          subjects: {
            orderBy: { orderIndex: "asc" },
            select: {
              orderIndex: true,
              titleOverride: true,
              olympiadId: true,
              olympiad: {
                select: {
                  title: true,
                  test: {
                    select: {
                      title: true,
                      subject: { select: { title: true } },
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
            },
          },
        },
      },
      bundleParticipant: {
        select: {
          firstName: true,
          lastName: true,
          gradeLabel: true,
          schoolName: true,
          deviceFpHash: true,
          assignedOlympiadIdsJson: true,
        },
      },
      sessions: {
        select: {
          olympiadId: true,
          status: true,
          result: {
            select: { score: true, maxScore: true, answersJson: true },
          },
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

  const subjectColSeen = new Set(subjectColumns.map((c) => c.olympiadId));

  type Scored = BundleStudentExportRow & { dedupKey: string; sortEarned: number };

  const scored: Scored[] = [];

  for (const attempt of raw) {
    const p = attempt.bundleParticipant;
    const assigned = parseParticipantAssignedOlympiadIds(p.assignedOlympiadIdsJson);
    const assignedSet = assigned.length > 0 ? new Set(assigned) : null;

    const visibleSubjects = attempt.bundle.subjects.filter(
      (s) => !assignedSet || assignedSet.has(s.olympiadId),
    );

    for (const sub of visibleSubjects) {
      if (!subjectColSeen.has(sub.olympiadId)) {
        subjectColSeen.add(sub.olympiadId);
        const title =
          sub.titleOverride ??
          sub.olympiad.test.subject?.title ??
          sub.olympiad.title ??
          sub.olympiad.test.title;
        subjectColumns.push({
          olympiadId: sub.olympiadId,
          header: subjectHeaderLabel(title, subjectColumns.length),
          subjectTitle: title,
        });
        if (!bundleDefs) {
          questionBanks.push(
            ...buildQuestionBankRows(title, sub.olympiad.test.questions),
          );
        }
      }
    }

    const sessionByOlympiad = new Map(attempt.sessions.map((s) => [s.olympiadId, s]));
    const subjectCells = new Map<string, BundleSubjectCell>();

    const subjectMaxes = visibleSubjects.map((sub) => ({
      olympiadId: sub.olympiadId,
      maxPoints: sumQuestionMaxPoints(sub.olympiad.test.questions),
    }));

    const sessionsForPoints = visibleSubjects.map((sub) => {
      const sess = sessionByOlympiad.get(sub.olympiadId);
      return {
        olympiadId: sub.olympiadId,
        status: sess?.status ?? "RULES_PENDING",
        result: sess?.result ?? null,
      };
    });

    const totals = computeBundleAttemptPoints(subjectMaxes, sessionsForPoints);

    for (const sub of visibleSubjects) {
      const sess = sessionByOlympiad.get(sub.olympiadId);
      const cell = sess
        ? analyzeSessionToCell({
            sessionStatus: sess.status,
            result: sess.result,
            attempt: sess.attempt,
            questions: sub.olympiad.test.questions,
          })
        : {
            earnedPoints: null,
            maxPoints: null,
            percent: null,
            correctQuestionNumbers: "",
            wrongQuestionNumbers: "",
            wrongDetails: "",
            status: "kiritilmagan" as const,
            questionDetails: [] as QuestionAnswerExportRow[],
          };

      subjectCells.set(sub.olympiadId, cell);
    }

    scored.push({
      gradeLabel: p.gradeLabel,
      gradeSectionKey: bundleGradeSectionKey(p.gradeLabel),
      firstName: p.firstName,
      lastName: p.lastName,
      schoolName: p.schoolName,
      bundleTitle: attempt.bundle.title,
      totalEarned: totals.earnedPoints,
      totalMax: totals.maxPoints,
      totalPercent: totals.percent,
      completedSubjects: totals.completedSubjects,
      totalSubjects: totals.totalSubjects,
      allDone: totals.allDone,
      subjectCells,
      dedupKey: `${attempt.bundleId}::${bundleStudentDedupKey(p)}`,
      sortEarned: totals.earnedPoints,
    });
  }

  const bestByStudent = new Map<string, Scored>();
  for (const row of scored) {
    const prev = bestByStudent.get(row.dedupKey);
    if (!prev || row.sortEarned > prev.sortEarned) {
      bestByStudent.set(row.dedupKey, row);
    }
  }

  const students = [...bestByStudent.values()].map(
    ({ dedupKey: _d, sortEarned: _s, ...row }) => row,
  );

  return { students, subjectColumns, questionBanks };
}

function safeSheetName(gradeKey: string, suffix: string): string {
  const base = canonicalBundleGradeSectionHeading(gradeKey).replace(/[\\/?*[\]:]/g, " ");
  const name = `${base} — ${suffix}`.trim();
  return name.length > 31 ? name.slice(0, 31) : name;
}

function buildGradeSummarySheet(
  students: BundleStudentExportRow[],
  subjectColumns: BundleSubjectColumn[],
): (string | number)[][] {
  const sorted = [...students].sort((a, b) => {
    if (b.totalEarned !== a.totalEarned) return b.totalEarned - a.totalEarned;
    return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "uz");
  });

  const header: (string | number)[] = [
    "O'rin",
    "Familiya",
    "Ism",
    "Sinf",
    "Maktab",
    "Paket",
    "Jami ball",
    "Jami maks",
    "Foiz %",
    "Tugagan fanlar",
  ];

  for (const col of subjectColumns) {
    header.push(`${col.header} — ball`);
    header.push(`${col.header} — to'g'ri savollar`);
    header.push(`${col.header} — xato savollar`);
    header.push(`${col.header} — xato tafsilot`);
    header.push(`${col.header} — holat`);
  }

  const rows: (string | number)[][] = [header];

  sorted.forEach((s, idx) => {
    const line: (string | number)[] = [
      idx + 1,
      s.lastName,
      s.firstName,
      s.gradeLabel,
      s.schoolName,
      s.bundleTitle,
      s.totalEarned,
      s.totalMax,
      s.totalPercent,
      `${s.completedSubjects}/${s.totalSubjects}`,
    ];

    for (const col of subjectColumns) {
      const cell = s.subjectCells.get(col.olympiadId);
      if (!cell || cell.status !== "yakunlangan") {
        line.push(cell?.status === "boshlangan" ? "jarayonda" : "—");
        line.push("");
        line.push("");
        line.push("");
        line.push(cell?.status === "boshlangan" ? "jarayonda" : "kiritilmagan");
      } else {
        line.push(cell.earnedPoints ?? "");
        line.push(cell.correctQuestionNumbers || "—");
        line.push(cell.wrongQuestionNumbers || "—");
        line.push(cell.wrongDetails || "—");
        line.push("yakunlangan");
      }
    }
    rows.push(line);
  });

  return rows;
}

function buildGradeQuestionsSheet(questionBanks: BundleQuestionBankRow[]): (string | number)[][] {
  const header = [
    "Fan",
    "Savol №",
    "Savol matni",
    "A",
    "B",
    "C",
    "D",
    "To'g'ri javob",
  ];
  const rows: (string | number)[][] = [header];
  for (const q of questionBanks) {
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

function buildGradeAnswersSheet(
  students: BundleStudentExportRow[],
  subjectColumns: BundleSubjectColumn[],
): (string | number)[][] {
  const sorted = [...students].sort((a, b) => {
    if (b.totalEarned !== a.totalEarned) return b.totalEarned - a.totalEarned;
    return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "uz");
  });

  const header = [
    "Familiya",
    "Ism",
    "Sinf",
    "Maktab",
    "Fan",
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

  for (const s of sorted) {
    for (const col of subjectColumns) {
      const cell = s.subjectCells.get(col.olympiadId);
      if (!cell?.questionDetails.length) continue;

      for (const q of cell.questionDetails) {
        rows.push([
          s.lastName,
          s.firstName,
          s.gradeLabel,
          s.schoolName,
          col.subjectTitle,
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
  }

  return rows;
}

/** Ko‘p fanli paket: har sinf uchun umumiy, savollar va javoblar varaqlari. */
export function buildBundleDetailedWorkbook(
  students: BundleStudentExportRow[],
  subjectColumns: BundleSubjectColumn[],
  questionBanks: BundleQuestionBankRow[],
): Buffer {
  const byGrade = new Map<string, BundleStudentExportRow[]>();
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
        XLSX.utils.aoa_to_sheet(buildGradeSummarySheet(group, subjectColumns)),
        safeSheetName(key, "umumiy"),
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(buildGradeQuestionsSheet(questionBanks)),
        safeSheetName(key, "savollar"),
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(buildGradeAnswersSheet(group, subjectColumns)),
        safeSheetName(key, "javoblar"),
      );
    }
  }

  const legend: (string | number)[][] = [
    ["Ko'p fanli paket — Excel izoh"],
    ["Har sinf uchun 3 varaq: umumiy | savollar | javoblar"],
    ["umumiy", "Ball, to'g'ri va xato savollar ro'yxati"],
    ["savollar", "Barcha savollar variantlari va to'g'ri javob"],
    ["javoblar", "Har talaba × har savol: tanlangan, holat (To'g'ri/Xato/Javobsiz)"],
    ["Xato tafsilot", "Masalan: 3(B→A) — tanlangan → to'g'ri"],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(legend), "Izoh");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function bundleDetailedExcelFilename(bundleTitle?: string, now = new Date()): string {
  const d = now.toISOString().slice(0, 10);
  const safe = (bundleTitle ?? "paket")
    .replace(/[^\w\u0400-\u04FF-]+/g, "-")
    .slice(0, 40);
  return `paket-tahlil-${safe}-${d}.xlsx`;
}
