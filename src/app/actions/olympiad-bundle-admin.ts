"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canOlympiadManage } from "@/lib/permissions";
import {
  codeHintFromNormalized,
  hashOlympiadCode,
  normalizeOlympiadCode,
} from "@/lib/olympiad/code-crypto";
import { writeAuditLog } from "@/lib/audit";
import { parseFormScheduleInstant } from "@/lib/datetime-local";
import { recomputeBundleRanks } from "@/lib/olympiad/bundle-aggregate";
import {
  compareBundleAttemptPoints,
  computeBundleAttemptPoints,
  sumQuestionMaxPoints,
} from "@/lib/olympiad/bundle-attempt-scoring";
import { bundleStudentDedupKey } from "@/lib/olympiad/bundle-student-key";
import {
  bundleGradeSectionKey,
  canonicalBundleGradeSectionHeading,
  sortBundleGradeSectionKeys,
} from "@/lib/olympiad/bundle-grade-section";
import { prismaErrorLogPayload, prismaErrorMessage } from "@/lib/prisma-errors";
import {
  assertTestAssignableForOlympiad,
  ensureOlympiadForTest,
} from "@/lib/olympiad/ensure-olympiad-for-test";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const createBundleSchema = z.object({
  title: z.string().trim().min(3).max(200),
  plainCode: z.string().trim().min(4).max(64),
  description: z.string().max(4000).optional().nullable(),
  startsAt: z.string().trim().min(1),
  endsAt: z.string().optional().nullable(),
  olympiadIds: z.array(z.string().min(1)).min(1).max(20).optional(),
  testIds: z.array(z.string().min(1)).min(1).max(20).optional(),
});

export type BundleTestPickerItem = {
  testId: string;
  title: string;
  subjectTitle: string | null;
  gradeNumber: number | null;
  questionCount: number;
  hasOlympiad: boolean;
};

/** Paketga qo‘shish uchun barcha nashr qilingan testlar. */
export async function listTestsForBundlePicker(): Promise<BundleTestPickerItem[]> {
  const session = await auth();
  if (!session?.user?.id || !canOlympiadManage(session)) return [];

  const where: Prisma.TestWhereInput = {
    status: "PUBLISHED",
    isDraft: false,
    isActive: true,
  };
  if (session.user.role === "TEACHER") {
    where.OR = [{ authorUserId: session.user.id }, { authorUserId: null }];
  }

  const tests = await prisma.test.findMany({
    where,
    orderBy: [{ subject: { grade: { number: "asc" } } }, { title: "asc" }],
    take: 300,
    select: {
      id: true,
      title: true,
      subject: { select: { title: true, grade: { select: { number: true } } } },
      _count: { select: { questions: true } },
      olympiads: {
        where: { status: { not: "DRAFT" } },
        take: 1,
        select: { id: true },
      },
    },
  });

  return tests.map((t) => ({
    testId: t.id,
    title: t.title,
    subjectTitle: t.subject?.title ?? null,
    gradeNumber: t.subject?.grade?.number ?? null,
    questionCount: t._count.questions,
    hasOlympiad: t.olympiads.length > 0,
  }));
}

/** @deprecated — `listTestsForBundlePicker` ishlating */
export async function listOlympiadsForBundlePicker() {
  const session = await auth();
  if (!session?.user?.id || !canOlympiadManage(session)) return [];

  return prisma.olympiad.findMany({
    where: { status: { not: "DRAFT" } },
    orderBy: { title: "asc" },
    take: 200,
    select: {
      id: true,
      title: true,
      durationMinutes: true,
      test: { select: { title: true, subject: { select: { title: true } } } },
    },
  });
}

export async function listOlympiadBundlesForAdmin() {
  const session = await auth();
  if (!session?.user?.id || !canOlympiadManage(session)) return [];

  return prisma.olympiadBundle.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      codeHint: true,
      isActive: true,
      startsAt: true,
      endsAt: true,
      _count: { select: { subjects: true, attempts: true } },
    },
  });
}

export async function createOlympiadBundleAction(
  formData: FormData,
): Promise<{ ok: true; bundleId: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id || !canOlympiadManage(session)) {
    return { ok: false, error: "Ruxsat yo‘q." };
  }

  const olympiadIdsRaw = [...new Set(formData.getAll("olympiadId").map(String).filter(Boolean))];
  const testIdsRaw = [...new Set(formData.getAll("testId").map(String).filter(Boolean))];
  const parsed = createBundleSchema.safeParse({
    title: formData.get("title"),
    plainCode: formData.get("plainCode"),
    description: formData.get("description"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    olympiadIds: olympiadIdsRaw.length ? olympiadIdsRaw : undefined,
    testIds: testIdsRaw.length ? testIdsRaw : undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path.includes("olympiadIds") || issue?.path.includes("testIds")) {
      return { ok: false, error: "Kamida bitta test tanlang." };
    }
    return { ok: false, error: "Ma’lumotlarni tekshiring." };
  }

  const norm = normalizeOlympiadCode(parsed.data.plainCode);
  const codeHash = hashOlympiadCode(norm);
  const startsAt = parseFormScheduleInstant(parsed.data.startsAt);
  const endsAt = parsed.data.endsAt ? parseFormScheduleInstant(parsed.data.endsAt) : null;
  if (!startsAt) return { ok: false, error: "Boshlanish vaqti noto‘g‘ri." };
  if (parsed.data.endsAt && !endsAt) return { ok: false, error: "Yakun vaqti noto‘g‘ri." };

  let olympiadIds: string[] = parsed.data.olympiadIds ?? [];

  if (parsed.data.testIds?.length) {
    for (const testId of parsed.data.testIds) {
      try {
        await assertTestAssignableForOlympiad(session, testId);
      } catch {
        return { ok: false, error: "Tanlangan testlardan biri mavjud emas yoki nashr qilinmagan." };
      }
    }
    const created: string[] = [];
    for (const testId of parsed.data.testIds) {
      const id = await ensureOlympiadForTest({
        testId,
        createdByUserId: session.user.id,
        startsAt,
        endsAt,
        durationMinutes: 60,
      });
      created.push(id);
    }
    olympiadIds = [...new Set([...olympiadIds, ...created])];
  }

  if (olympiadIds.length === 0) {
    return { ok: false, error: "Kamida bitta test tanlang." };
  }

  const olympiads = await prisma.olympiad.findMany({
    where: { id: { in: olympiadIds } },
    select: { id: true },
  });
  if (olympiads.length !== olympiadIds.length) {
    return { ok: false, error: "Ba’zi olimpiadalar topilmadi." };
  }

  try {
    const bundle = await prisma.olympiadBundle.create({
      data: {
        title: parsed.data.title,
        codeHash,
        codeHint: codeHintFromNormalized(norm),
        description: parsed.data.description?.trim() || null,
        startsAt,
        endsAt,
        createdById: session.user.id,
        subjects: {
          create: olympiadIds.map((olympiadId, orderIndex) => ({
            olympiadId,
            orderIndex,
          })),
        },
      },
      select: { id: true },
    });

    try {
      await writeAuditLog({
        actorUserId: session.user.id,
        action: "OLYMPIAD_BUNDLE_CREATE",
        entityType: "OlympiadBundle",
        entityId: bundle.id,
        metadata: { subjectCount: olympiadIds.length },
      });
    } catch {
      /* audit failure must not block bundle creation */
    }

    revalidatePath("/admin/oimpiadalar");
    revalidatePath("/oqituvchi/oimpiadalar");
    return { ok: true, bundleId: bundle.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Bu kod allaqachon ishlatilgan." };
    }
    console.error("createOlympiadBundleAction", prismaErrorLogPayload(e));
    return { ok: false, error: prismaErrorMessage(e) };
  }
}

export async function getOlympiadBundleAdminDetail(bundleId: string) {
  const session = await auth();
  if (!session?.user?.id || !canOlympiadManage(session)) return null;

  return prisma.olympiadBundle.findUnique({
    where: { id: bundleId },
    select: {
      id: true,
      title: true,
      codeHint: true,
      description: true,
      isActive: true,
      startsAt: true,
      endsAt: true,
      subjects: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          orderIndex: true,
          titleOverride: true,
          durationOverrideMinutes: true,
          olympiad: {
            select: {
              id: true,
              title: true,
              durationMinutes: true,
              status: true,
              _count: { select: { participants: true } },
            },
          },
        },
      },
      attempts: {
        take: 200,
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          totalScore: true,
          totalMaxScore: true,
          completedAt: true,
          overallRank: true,
          bundleParticipant: {
            select: { firstName: true, lastName: true, gradeLabel: true, schoolName: true },
          },
          sessions: {
            select: {
              olympiadId: true,
              status: true,
              olympiad: { select: { title: true } },
            },
          },
        },
      },
    },
  });
}

const BUNDLE_FILTER_MAX = 120;

function clampBundleFilter(raw: string | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return "";
  return t.length > BUNDLE_FILTER_MAX ? t.slice(0, BUNDLE_FILTER_MAX) : t;
}

export type AdminBundleResultRow = {
  id: string;
  bundleId: string;
  bundleTitle: string;
  /** Paket bo‘yicha umumiy reyting (#). */
  overallRank: number | null;
  /** Shu sinf guruhi ichidagi reyting (faqat yakunlanganlar). */
  gradeSectionRank: number | null;
  earnedPoints: number;
  maxPoints: number;
  percent: number;
  firstName: string;
  lastName: string;
  gradeLabel: string;
  schoolName: string;
  completedAt: string | null;
  completedSubjects: number;
  totalSubjects: number;
};

export type AdminBundleResultsGradeSection = {
  /** Sarlavha uchun matn ("8-A sinfi"). */
  heading: string;
  rows: AdminBundleResultRow[];
};

export async function listAdminBundleResultsTable(params: {
  bundleId?: string;
  gradeLabel?: string;
  school?: string;
  name?: string;
  /** Eski API bilan mos (# sahifalashtirish olib tashlandi). */
  page?: number;
  pageSize?: number;
}): Promise<{
  sections: AdminBundleResultsGradeSection[];
  total: number;
  bundleOptions: { id: string; title: string }[];
} | null> {
  const session = await auth();
  if (!session?.user?.id || !canOlympiadManage(session)) return null;

  const participantWhere: Prisma.OlympiadBundleParticipantWhereInput = {};
  const g = clampBundleFilter(params.gradeLabel);
  const s = clampBundleFilter(params.school);
  const n = clampBundleFilter(params.name);
  if (g) participantWhere.gradeLabel = { contains: g, mode: "insensitive" };
  if (s) participantWhere.schoolName = { contains: s, mode: "insensitive" };
  if (n) {
    participantWhere.OR = [
      { firstName: { contains: n, mode: "insensitive" } },
      { lastName: { contains: n, mode: "insensitive" } },
    ];
  }

  const where: Prisma.OlympiadBundleAttemptWhereInput = {};
  const bid = clampBundleFilter(params.bundleId);
  if (bid) {
    where.bundleId = bid;
    await recomputeBundleRanks(bid).catch(() => undefined);
  }
  if (Object.keys(participantWhere).length) where.bundleParticipant = participantWhere;

  if (session.user.role === "TEACHER") {
    where.bundle = { createdById: session.user.id };
  }

  const bundleWhere: Prisma.OlympiadBundleWhereInput =
    session.user.role === "TEACHER" ? { createdById: session.user.id } : {};

  const DEDUPE_FETCH_CAP = 2500;

  const [rawRows, bundleOptions] = await Promise.all([
    prisma.olympiadBundleAttempt.findMany({
      where,
      orderBy: [{ startedAt: "desc" }],
      take: DEDUPE_FETCH_CAP,
      select: {
        id: true,
        bundleId: true,
        overallRank: true,
        completedAt: true,
        bundle: {
          select: {
            title: true,
            subjects: {
              select: {
                olympiadId: true,
                olympiad: {
                  select: {
                    test: { select: { questions: { select: { points: true } } } },
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
    }),
    prisma.olympiadBundle.findMany({
      where: bundleWhere,
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  type ScoredRow = Omit<AdminBundleResultRow, "gradeSectionRank"> & {
    points: ReturnType<typeof computeBundleAttemptPoints>;
    dedupKey: string;
  };

  const scored: ScoredRow[] = rawRows.map((a) => {
    const p = a.bundleParticipant;
    const subjectMaxes = a.bundle.subjects.map((s) => ({
      olympiadId: s.olympiadId,
      maxPoints: sumQuestionMaxPoints(s.olympiad.test.questions),
    }));
    const points = computeBundleAttemptPoints(subjectMaxes, a.sessions);

    return {
      id: a.id,
      bundleId: a.bundleId,
      bundleTitle: a.bundle.title,
      overallRank: a.overallRank,
      earnedPoints: points.earnedPoints,
      maxPoints: points.maxPoints,
      percent: points.percent,
      firstName: p.firstName,
      lastName: p.lastName,
      gradeLabel: p.gradeLabel,
      schoolName: p.schoolName,
      completedAt: a.completedAt?.toISOString() ?? null,
      completedSubjects: points.completedSubjects,
      totalSubjects: points.totalSubjects,
      points,
      dedupKey: `${a.bundleId}::${bundleStudentDedupKey(p)}`,
    };
  });

  const bestByStudent = new Map<string, ScoredRow>();
  for (const row of scored) {
    const prev = bestByStudent.get(row.dedupKey);
    if (!prev || compareBundleAttemptPoints(row.points, prev.points) > 0) {
      bestByStudent.set(row.dedupKey, row);
    }
  }

  const deduped = [...bestByStudent.values()].sort((a, b) => {
    if (a.points.allDone !== b.points.allDone) return a.points.allDone ? -1 : 1;
    const cmp = compareBundleAttemptPoints(a.points, b.points);
    if (cmp !== 0) return -cmp;
    const an = `${a.lastName} ${a.firstName}`;
    const bn = `${b.lastName} ${b.firstName}`;
    return an.localeCompare(bn, "uz");
  });

  /** Jadvaldagi tartib uchun (DB dagi stale null ranklardan mustaqil) — yakunlanganlar uchun sıralı #'lar. */
  let leaderboardPos = 0;
  const leaderboardRows: AdminBundleResultRow[] = deduped.map((row) => {
    const { points: _pt, dedupKey: _dk, overallRank: _dbRank, ...base } = row;
    let overallRank: number | null = null;
    if (row.points.allDone) {
      leaderboardPos += 1;
      overallRank = leaderboardPos;
    }
    return { ...base, overallRank, gradeSectionRank: null };
  });

  const byGradeBucket = new Map<string, AdminBundleResultRow[]>();

  for (const row of leaderboardRows) {
    const key = bundleGradeSectionKey(row.gradeLabel);
    if (!byGradeBucket.has(key)) byGradeBucket.set(key, []);
    byGradeBucket.get(key)!.push(row);
  }

  const sections: AdminBundleResultsGradeSection[] = sortBundleGradeSectionKeys(byGradeBucket.keys()).map((key) => {
    const bucket = byGradeBucket.get(key)!;
    let sr = 0;
    const rows = bucket.map((r) => {
      let gradeSectionRank: number | null = null;
      if (r.overallRank != null) {
        sr += 1;
        gradeSectionRank = sr;
      }
      return { ...r, gradeSectionRank };
    });
    const headingLabel = canonicalBundleGradeSectionHeading(key);
    return { heading: headingLabel, rows };
  });

  const total = leaderboardRows.length;

  return { sections, total, bundleOptions };
}

export async function publishBundleRankingsFormAction(formData: FormData): Promise<void> {
  const bundleId = String(formData.get("bundleId") ?? "");
  if (bundleId) await publishBundleRankingsAction(bundleId);
}

export async function publishBundleRankingsAction(bundleId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id || !canOlympiadManage(session)) {
    return { ok: false, error: "Ruxsat yo‘q." };
  }
  try {
    await recomputeBundleRanks(bundleId);
    revalidatePath(`/admin/oimpiadalar/bundle/${bundleId}`);
    revalidatePath(`/oqituvchi/oimpiadalar/bundle/${bundleId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Reytingni yangilab bo‘lmadi." };
  }
}
