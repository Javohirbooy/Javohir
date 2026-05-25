import { prisma } from "@/lib/prisma";
import {
  compareBundleAttemptPoints,
  computeBundleAttemptPoints,
  sumQuestionMaxPoints,
  type BundleSubjectMax,
} from "@/lib/olympiad/bundle-attempt-scoring";
import { bundleGradeSectionKey } from "@/lib/olympiad/bundle-grade-section";
import { bundleStudentDedupKey } from "@/lib/olympiad/bundle-student-key";
import { parseParticipantAssignedOlympiadIds } from "@/lib/olympiad/bundle-variant-assign";

const bundleSubjectMaxSelect = {
  olympiadId: true,
  olympiad: {
    select: {
      test: { select: { questions: { select: { points: true } } } },
    },
  },
} as const;

function subjectMaxList(
  subjects: Array<{
    olympiadId: string;
    olympiad: { test: { questions: { points: number | null }[] } };
  }>,
): BundleSubjectMax[] {
  return subjects.map((s) => ({
    olympiadId: s.olympiadId,
    maxPoints: sumQuestionMaxPoints(s.olympiad.test.questions),
  }));
}

/** Paket urinishi bo‘yicha jami ball va reytinglarni qayta hisoblaydi (submit/finalize dan keyin). */
export async function recomputeBundleAttemptScores(bundleAttemptId: string): Promise<void> {
  const attempt = await prisma.olympiadBundleAttempt.findUnique({
    where: { id: bundleAttemptId },
    select: {
      id: true,
      bundleId: true,
      bundleParticipant: { select: { assignedOlympiadIdsJson: true } },
      bundle: {
        select: {
          subjects: {
            orderBy: { orderIndex: "asc" },
            select: bundleSubjectMaxSelect,
          },
        },
      },
      sessions: {
        select: {
          olympiadId: true,
          status: true,
          result: { select: { score: true, maxScore: true } },
        },
      },
    },
  });
  if (!attempt) return;

  const assignedIds = parseParticipantAssignedOlympiadIds(
    attempt.bundleParticipant.assignedOlympiadIdsJson,
  );
  const assignedSet = assignedIds.length > 0 ? new Set(assignedIds) : null;
  const visibleSubjects = assignedSet
    ? attempt.bundle.subjects.filter((s) => assignedSet.has(s.olympiadId))
    : attempt.bundle.subjects;

  const subjectMaxes = subjectMaxList(visibleSubjects);
  const sessions = assignedSet
    ? attempt.sessions.filter((s) => assignedSet.has(s.olympiadId))
    : attempt.sessions;
  const points = computeBundleAttemptPoints(subjectMaxes, sessions);

  await prisma.olympiadBundleAttempt.update({
    where: { id: bundleAttemptId },
    data: {
      totalScore: points.earnedPoints,
      totalMaxScore: points.maxPoints,
      completedAt: points.allDone ? new Date() : null,
    },
  });

  if (points.allDone) {
    await recomputeBundleRanks(attempt.bundleId);
  } else {
    await prisma.olympiadBundleAttempt.update({
      where: { id: bundleAttemptId },
      data: { overallRank: null, schoolRank: null, classRank: null },
    });
  }
}

/** Paket bo‘yicha umumiy reyting — har talaba uchun eng yaxshi yakunlangan urinish. */
export async function recomputeBundleRanks(bundleId: string): Promise<void> {
  const bundle = await prisma.olympiadBundle.findUnique({
    where: { id: bundleId },
    select: {
      subjects: { orderBy: { orderIndex: "asc" }, select: bundleSubjectMaxSelect },
    },
  });
  if (!bundle) return;

  const subjectMaxes = subjectMaxList(bundle.subjects);

  const attempts = await prisma.olympiadBundleAttempt.findMany({
    where: { bundleId },
    select: {
      id: true,
      totalScore: true,
      totalMaxScore: true,
      completedAt: true,
      startedAt: true,
      bundleParticipant: {
        select: {
          firstName: true,
          lastName: true,
          gradeLabel: true,
          schoolName: true,
          deviceFpHash: true,
        },
      },
      sessions: {
        select: {
          olympiadId: true,
          status: true,
          result: { select: { score: true, maxScore: true } },
        },
      },
    },
  });

  await prisma.olympiadBundleAttempt.updateMany({
    where: { bundleId },
    data: { overallRank: null, schoolRank: null, classRank: null },
  });

  const bestByStudent = new Map<
    string,
    { id: string; points: ReturnType<typeof computeBundleAttemptPoints>; school: string; grade: string }
  >();

  const attemptsDesc = [...attempts].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  for (const a of attemptsDesc) {
    const points = computeBundleAttemptPoints(subjectMaxes, a.sessions);
    const key = bundleStudentDedupKey(a.bundleParticipant);
    const cur = bestByStudent.get(key);
    if (!cur || compareBundleAttemptPoints(points, cur.points) > 0) {
      bestByStudent.set(key, {
        id: a.id,
        points,
        school: a.bundleParticipant.schoolName,
        grade: a.bundleParticipant.gradeLabel,
      });
    }
  }

  const toRank = [...bestByStudent.values()].filter((x) => x.points.allDone);

  const byOverall = [...toRank].sort((a, b) => {
    const c = compareBundleAttemptPoints(a.points, b.points);
    if (c !== 0) return -c;
    return a.id.localeCompare(b.id);
  });
  const overallRank = new Map<string, number>();
  byOverall.forEach((a, i) => overallRank.set(a.id, i + 1));

  const schoolGroups = new Map<string, typeof toRank>();
  const classGroups = new Map<string, typeof toRank>();
  for (const a of toRank) {
    const school = a.school;
    const cls = `${school}::${bundleGradeSectionKey(a.grade)}`;
    if (!schoolGroups.has(school)) schoolGroups.set(school, []);
    if (!classGroups.has(cls)) classGroups.set(cls, []);
    schoolGroups.get(school)!.push(a);
    classGroups.get(cls)!.push(a);
  }

  const schoolRank = new Map<string, number>();
  const classRank = new Map<string, number>();

  for (const [, group] of schoolGroups) {
    const sorted = [...group].sort((a, b) => {
      const c = compareBundleAttemptPoints(a.points, b.points);
      if (c !== 0) return -c;
      return a.id.localeCompare(b.id);
    });
    sorted.forEach((a, i) => schoolRank.set(a.id, i + 1));
  }
  for (const [, group] of classGroups) {
    const sorted = [...group].sort((a, b) => {
      const c = compareBundleAttemptPoints(a.points, b.points);
      if (c !== 0) return -c;
      return a.id.localeCompare(b.id);
    });
    sorted.forEach((a, i) => classRank.set(a.id, i + 1));
  }

  const rankedIds = new Set([...overallRank.keys(), ...schoolRank.keys(), ...classRank.keys()]);

  if (rankedIds.size === 0) return;

  const rankData = new Map(toRank.map((t) => [t.id, t.points]));

  await prisma.$transaction(
    [...rankedIds].map((id) => {
      const pts = rankData.get(id)!;
      return prisma.olympiadBundleAttempt.update({
        where: { id },
        data: {
          totalScore: pts.earnedPoints,
          totalMaxScore: pts.maxPoints,
          overallRank: overallRank.get(id) ?? null,
          schoolRank: schoolRank.get(id) ?? null,
          classRank: classRank.get(id) ?? null,
        },
      });
    }),
  );
}
