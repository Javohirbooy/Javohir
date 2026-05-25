import { isOlympiadExamTerminalStatus } from "@/lib/olympiad/exam-state-machine";
import { olympiadResultToPoints } from "@/lib/olympiad/result-points";

import { normalizeMcqQuestionWeight } from "@/lib/mcq/normalize-question-weight";

export function sumQuestionMaxPoints(questions: { points: number | null }[]): number {
  return questions.reduce((s, q) => s + normalizeMcqQuestionWeight(q.points), 0);
}

export type BundleSubjectMax = { olympiadId: string; maxPoints: number };

export type BundleAttemptPoints = {
  earnedPoints: number;
  maxPoints: number;
  percent: number;
  completedSubjects: number;
  totalSubjects: number;
  allDone: boolean;
};

export function computeBundleAttemptPoints(
  subjects: BundleSubjectMax[],
  sessions: Array<{
    olympiadId: string;
    status: string;
    result: { score: number | null; maxScore: number | null } | null;
  }>,
): BundleAttemptPoints {
  const sessionByOid = new Map(sessions.map((s) => [s.olympiadId, s]));
  let earnedPoints = 0;
  let maxPoints = 0;
  let completedSubjects = 0;

  for (const sub of subjects) {
    maxPoints += sub.maxPoints;
    const sess = sessionByOid.get(sub.olympiadId);
    if (sess?.result && isOlympiadExamTerminalStatus(sess.status)) {
      completedSubjects++;
      earnedPoints += olympiadResultToPoints(sess.result.score, sess.result.maxScore).earnedPoints;
    }
  }

  const totalSubjects = subjects.length;
  const percent =
    maxPoints > 0 ? Math.min(100, Math.round((earnedPoints / maxPoints) * 1000) / 10) : 0;

  return {
    earnedPoints: Math.round(earnedPoints * 10) / 10,
    maxPoints: Math.round(maxPoints * 10) / 10,
    percent,
    completedSubjects,
    totalSubjects,
    allDone: completedSubjects === totalSubjects && totalSubjects > 0,
  };
}

/** Reyting / jadvalda qaysi urinish yaxshiroq ekanini tanlash. */
export function compareBundleAttemptPoints(a: BundleAttemptPoints, b: BundleAttemptPoints): number {
  if (a.percent !== b.percent) return a.percent - b.percent;
  if (a.completedSubjects !== b.completedSubjects) return a.completedSubjects - b.completedSubjects;
  return a.earnedPoints - b.earnedPoints;
}
