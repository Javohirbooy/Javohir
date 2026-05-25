import { prisma } from "@/lib/prisma";
import { resolveBundleSubjectStatus } from "@/lib/olympiad/bundle-subject-status";
import { computeBundleAttemptPoints, sumQuestionMaxPoints } from "@/lib/olympiad/bundle-attempt-scoring";
import { olympiadResultToPoints } from "@/lib/olympiad/result-points";
import type { BundleDashboardPayload } from "@/lib/olympiad/bundle-types";
import {
  ensureBundleParticipantAssignments,
  parseParticipantAssignedOlympiadIds,
} from "@/lib/olympiad/bundle-variant-assign";

const bundleAttemptSelect = {
  id: true,
  totalScore: true,
  totalMaxScore: true,
  bundle: {
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      endsAt: true,
      subjects: {
        orderBy: { orderIndex: "asc" as const },
        select: {
          orderIndex: true,
          titleOverride: true,
          durationOverrideMinutes: true,
          olympiad: {
            select: {
              id: true,
              title: true,
              durationMinutes: true,
              status: true,
              test: {
                select: {
                  title: true,
                  subject: { select: { title: true, imageEmoji: true } },
                  _count: { select: { questions: true } },
                  questions: { select: { points: true } },
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
      id: true,
      assignedOlympiadIdsJson: true,
      firstName: true,
      lastName: true,
      schoolName: true,
      gradeLabel: true,
      region: true,
    },
  },
  sessions: {
    select: {
      id: true,
      olympiadId: true,
      status: true,
      result: { select: { score: true, maxScore: true } },
    },
  },
} as const;

export async function buildBundleDashboard(bundleAttemptId: string): Promise<BundleDashboardPayload | null> {
  const row = await prisma.olympiadBundleAttempt.findUnique({
    where: { id: bundleAttemptId },
    select: bundleAttemptSelect,
  });
  if (!row) return null;

  const p = row.bundleParticipant;
  let assignedOlympiadIds = parseParticipantAssignedOlympiadIds(p.assignedOlympiadIdsJson);
  if (assignedOlympiadIds.length === 0) {
    assignedOlympiadIds = await ensureBundleParticipantAssignments(p.id, row.bundle.id);
  }
  const assignedSet =
    assignedOlympiadIds.length > 0 ? new Set(assignedOlympiadIds) : null;

  const visibleBundleSubjects = assignedSet
    ? row.bundle.subjects.filter((sub) => assignedSet.has(sub.olympiad.id))
    : row.bundle.subjects;

  const sessionByOlympiad = new Map(row.sessions.map((s) => [s.olympiadId, s]));

  let previousAllCompleted = true;
  let completedCount = 0;
  const subjects = visibleBundleSubjects.map((sub) => {
    const olymp = sub.olympiad;
    const sess = sessionByOlympiad.get(olymp.id) ?? null;
    const status = resolveBundleSubjectStatus(sess, previousAllCompleted);
    if (status === "COMPLETED") completedCount++;
    if (status !== "COMPLETED") previousAllCompleted = false;

    const qCount = olymp.test._count.questions;
    const totalPoints = olymp.test.questions.reduce((sum, q) => sum + (q.points ?? 1), 0);
    const pts = sess?.result
      ? olympiadResultToPoints(sess.result.score, sess.result.maxScore)
      : null;

    return {
      olympiadId: olymp.id,
      orderIndex: sub.orderIndex,
      title: sub.titleOverride ?? olymp.test.subject?.title ?? olymp.title,
      subjectEmoji: olymp.test.subject?.imageEmoji ?? null,
      durationMinutes: sub.durationOverrideMinutes ?? olymp.durationMinutes,
      questionCount: qCount,
      totalPoints,
      status,
      sessionId: sess?.id ?? null,
      score: pts?.earnedPoints ?? null,
      maxScore: pts?.maxPoints ?? null,
      percent: pts?.percent ?? null,
    };
  });

  const totalSubjects = subjects.length;
  const completionPercent =
    totalSubjects > 0 ? Math.round((completedCount / totalSubjects) * 1000) / 10 : 0;

  const subjectMaxes = visibleBundleSubjects.map((sub) => ({
    olympiadId: sub.olympiad.id,
    maxPoints: sumQuestionMaxPoints(sub.olympiad.test.questions),
  }));
  const bundleTotals = computeBundleAttemptPoints(
    subjectMaxes,
    row.sessions
      .filter((s) => !assignedSet || assignedSet.has(s.olympiadId))
      .map((s) => ({
        olympiadId: s.olympiadId,
        status: s.status,
        result: s.result,
      })),
  );

  return {
    bundleId: row.bundle.id,
    title: row.bundle.title,
    description: row.bundle.description,
    studentName: `${p.firstName} ${p.lastName}`.trim(),
    schoolName: p.schoolName,
    gradeLabel: p.gradeLabel,
    region: p.region,
    startsAt: row.bundle.startsAt.toISOString(),
    endsAt: row.bundle.endsAt?.toISOString() ?? null,
    completedCount,
    totalSubjects,
    completionPercent,
    allCompleted: completedCount === totalSubjects && totalSubjects > 0,
    subjects,
    totalScore: bundleTotals.earnedPoints,
    totalMaxScore: bundleTotals.maxPoints,
  };
}
