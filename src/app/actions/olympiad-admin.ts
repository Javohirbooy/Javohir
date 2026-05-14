"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canOlympiadManage } from "@/lib/permissions";
import { assertOlympiadManage } from "@/lib/olympiad/authz";
import {
  codeHintFromNormalized,
  hashOlympiadCode,
  normalizeOlympiadCode,
} from "@/lib/olympiad/code-crypto";
import { writeAuditLog } from "@/lib/audit";
import { runManualOlympiadSessionFinalization } from "@/lib/olympiad/finalize-overdue-worker";
import { issueCertificatesForOlympiad, revokeCertificateByVerifyId } from "@/lib/olympiad/certificate-service";
import { readOlympiadFinalizeHeartbeat, type OlympiadCronHeartbeatPayload } from "@/lib/worker/olympiad-cron-heartbeat";
import { OLYMPIAD_FINALIZATION_REASON } from "@/lib/olympiad/finalization-constants";
import { isOlympiadPublishIncludeAutoFinalized } from "@/lib/olympiad/feature-flags";
import { executeOlympiadPublishRankingInTx } from "@/lib/olympiad/publish-ranking-sql";
import type { Prisma } from "@prisma/client";
import type { Session } from "next-auth";
import { z } from "zod";

function slugBase(title: string) {
  const t = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return t || "olympiad";
}

async function allocateSlug(title: string) {
  const base = slugBase(title);
  for (let i = 0; i < 10; i++) {
    const suf = randomBytes(2).toString("hex");
    const slug = `${base}-${suf}`;
    const ex = await prisma.olympiad.findUnique({ where: { slug }, select: { id: true } });
    if (!ex) return slug;
  }
  throw new Error("slug");
}

const createSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().max(4000).optional().nullable(),
  testId: z.string().min(1),
  responsibleUserId: z.string().optional().nullable(),
  startsAt: z.string().trim().min(1, "Boshlanish vaqti majburiy."),
  endsAt: z
    .string()
    .optional()
    .nullable()
    .transform((s) => {
      if (s == null) return null;
      const t = String(s).trim();
      return t.length ? t : null;
    }),
  durationMinutes: z.coerce.number().int().min(5).max(300),
  participantLimit: z.coerce.number().int().min(1).max(100_000).optional().nullable(),
  antiCheatStrictness: z.enum(["OFF", "STANDARD", "STRICT"]),
  resultVisibility: z.enum(["IMMEDIATE", "DELAYED"]),
});

const scheduleUpdateSchema = z.object({
  olympiadId: z.string().min(1),
  startsAt: z.string().trim().min(1, "Boshlanish vaqti majburiy."),
  endsAt: z
    .string()
    .optional()
    .nullable()
    .transform((s) => {
      if (s == null) return null;
      const t = String(s).trim();
      return t.length ? t : null;
    }),
});

export async function getTestsEligibleForOlympiad() {
  const session = await auth();
  if (!session?.user?.id) return [];
  if (!canOlympiadManage(session)) return [];

  if (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") {
    return prisma.test.findMany({
      where: { status: "PUBLISHED", isDraft: false, isActive: true },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
      take: 250,
    });
  }
  if (session.user.role === "TEACHER") {
    return prisma.test.findMany({
      where: {
        status: "PUBLISHED",
        isDraft: false,
        isActive: true,
        OR: [{ authorUserId: session.user.id }, { authorUserId: null }],
      },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
      take: 250,
    });
  }
  return [];
}

async function assertTestAssignable(session: Session, testId: string) {
  if (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") {
    const t = await prisma.test.findFirst({
      where: { id: testId, status: "PUBLISHED", isDraft: false, isActive: true },
      select: { id: true },
    });
    if (!t) throw new Error("TEST");
    return;
  }
  if (session.user.role === "TEACHER") {
    const t = await prisma.test.findFirst({
      where: {
        id: testId,
        status: "PUBLISHED",
        isDraft: false,
        isActive: true,
        OR: [{ authorUserId: session.user.id }, { authorUserId: null }],
      },
      select: { id: true },
    });
    if (!t) throw new Error("TEST");
    return;
  }
  throw new Error("FORBIDDEN");
}

export async function createOlympiadAction(
  _prev: null | { ok: true; id: string } | { ok: false; error: string },
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Kirish talab qilinadi." };
  if (!canOlympiadManage(session)) return { ok: false, error: "Ruxsat yo‘q." };

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || null,
    testId: formData.get("testId"),
    responsibleUserId: formData.get("responsibleUserId") || null,
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    durationMinutes: formData.get("durationMinutes"),
    participantLimit: formData.get("participantLimit") || null,
    antiCheatStrictness: formData.get("antiCheatStrictness") ?? "STANDARD",
    resultVisibility: formData.get("resultVisibility") ?? "DELAYED",
  });
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    const msg =
      fe.startsAt?.[0] ??
      fe.endsAt?.[0] ??
      fe.durationMinutes?.[0] ??
      fe.title?.[0] ??
      "Ma’lumotlar noto‘g‘ri.";
    return { ok: false, error: msg };
  }
  const v = parsed.data;
  const shuffleQuestions = formData.get("shuffleQuestions") === "on";
  const shuffleOptions = formData.get("shuffleOptions") === "on";
  const startsAt = new Date(v.startsAt);
  const endsAtRaw = typeof v.endsAt === "string" ? v.endsAt.trim() : "";
  const endsAt = endsAtRaw.length > 0 ? new Date(endsAtRaw) : null;
  if (Number.isNaN(startsAt.getTime())) return { ok: false, error: "Boshlanish vaqti noto‘g‘ri." };
  if (endsAt && Number.isNaN(endsAt.getTime())) return { ok: false, error: "Yakun vaqti noto‘g‘ri." };
  if (endsAt && endsAt.getTime() <= startsAt.getTime()) {
    return { ok: false, error: "Yakun vaqti boshlanish vaqtidan keyin bo‘lishi kerak (ikkala vaqt mustaqil)." };
  }

  let responsibleUserId = v.responsibleUserId?.trim() || null;
  if (session.user.role === "TEACHER") {
    if (responsibleUserId && responsibleUserId !== session.user.id) {
      responsibleUserId = null;
    }
  }

  try {
    await assertTestAssignable(session, v.testId);
  } catch {
    return { ok: false, error: "Test tanlanmagan yoki mavjud emas." };
  }

  try {
    const slug = await allocateSlug(v.title);
    const row = await prisma.olympiad.create({
      data: {
        title: v.title,
        slug,
        description: v.description ?? null,
        testId: v.testId,
        createdByUserId: session.user.id,
        responsibleUserId,
        startsAt,
        endsAt,
        durationMinutes: v.durationMinutes,
        participantLimit: v.participantLimit ?? null,
        antiCheatStrictness: v.antiCheatStrictness,
        resultVisibility: v.resultVisibility,
        status: "SCHEDULED",
        shuffleQuestions,
        shuffleOptions,
      },
    });
    await writeAuditLog({
      actorUserId: session.user.id,
      action: "OLYMPIAD_CREATE",
      entityType: "Olympiad",
      entityId: row.id,
      metadata: { title: row.title, slug: row.slug },
    });
    revalidatePath("/admin/oimpiadalar");
    revalidatePath("/oqituvchi/oimpiadalar");
    return { ok: true, id: row.id };
  } catch {
    return { ok: false, error: "Yaratishda xato." };
  }
}

export async function updateOlympiadScheduleAction(
  _prev: null | { ok: true } | { ok: false; error: string },
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Kirish talab qilinadi." };
  if (!canOlympiadManage(session)) return { ok: false, error: "Ruxsat yo‘q." };

  const parsed = scheduleUpdateSchema.safeParse({
    olympiadId: formData.get("olympiadId"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
  });
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      error: fe.startsAt?.[0] ?? fe.endsAt?.[0] ?? fe.olympiadId?.[0] ?? "Jadval ma’lumotlari noto‘g‘ri.",
    };
  }
  const { olympiadId, startsAt: startsRaw, endsAt: endsRaw } = parsed.data;
  try {
    await assertOlympiadManage(session, olympiadId);
  } catch {
    return { ok: false, error: "Ruxsat yo‘q." };
  }

  const startsAt = new Date(startsRaw);
  const endsAt = endsRaw ? new Date(endsRaw) : null;
  if (Number.isNaN(startsAt.getTime())) return { ok: false, error: "Boshlanish vaqti noto‘g‘ri." };
  if (endsAt && Number.isNaN(endsAt.getTime())) return { ok: false, error: "Yakun vaqti noto‘g‘ri." };
  if (endsAt && endsAt.getTime() <= startsAt.getTime()) {
    return { ok: false, error: "Yakun vaqti boshlanish vaqtidan keyin bo‘lishi kerak." };
  }

  try {
    await prisma.olympiad.update({
      where: { id: olympiadId },
      data: { startsAt, endsAt },
    });
    await writeAuditLog({
      actorUserId: session.user.id,
      action: "OLYMPIAD_SCHEDULE_UPDATE",
      entityType: "Olympiad",
      entityId: olympiadId,
      metadata: { startsAt: startsAt.toISOString(), endsAt: endsAt?.toISOString() ?? null },
    });
    revalidatePath(`/admin/oimpiadalar/${olympiadId}`);
    revalidatePath(`/oqituvchi/oimpiadalar/${olympiadId}`);
    revalidatePath("/admin/oimpiadalar");
    revalidatePath("/oqituvchi/oimpiadalar");
    return { ok: true };
  } catch {
    return { ok: false, error: "Saqlashda xato." };
  }
}

const codeSchema = z.object({
  plainCode: z.string().trim().min(4).max(64),
  maxUses: z.coerce.number().int().min(1).optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

/** `<form action>` uchun — natija klientga qaytarilmaydi. */
export async function addOlympiadCodeFormAction(formData: FormData): Promise<void> {
  await addOlympiadCodeAction(formData);
}

export async function addOlympiadCodeAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Kirish talab qilinadi." };
  const olympiadId = String(formData.get("olympiadId") ?? "");
  if (!olympiadId) return { ok: false, error: "Olimpiada tanlanmagan." };
  try {
    await assertOlympiadManage(session, olympiadId);
  } catch {
    return { ok: false, error: "Ruxsat yo‘q." };
  }

  const parsed = codeSchema.safeParse({
    plainCode: formData.get("plainCode"),
    maxUses: formData.get("maxUses") || null,
    expiresAt: formData.get("expiresAt") || null,
  });
  if (!parsed.success) return { ok: false, error: "Kod noto‘g‘ri." };
  const norm = normalizeOlympiadCode(parsed.data.plainCode);
  const codeHash = hashOlympiadCode(norm);
  const hint = codeHintFromNormalized(norm);
  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return { ok: false, error: "Muddat noto‘g‘ri." };

  try {
    await prisma.olympiadCode.create({
      data: {
        olympiadId,
        codeHash,
        codeHint: hint,
        maxUses: parsed.data.maxUses ?? null,
        expiresAt,
      },
    });
    await writeAuditLog({
      actorUserId: session.user.id,
      action: "OLYMPIAD_CODE_CREATE",
      entityType: "Olympiad",
      entityId: olympiadId,
      metadata: { hint },
    });
    revalidatePath(`/admin/oimpiadalar/${olympiadId}`);
    revalidatePath(`/oqituvchi/oimpiadalar/${olympiadId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Bu kod allaqachon mavjud yoki saqlab bo‘lmadi." };
  }
}

export async function olympiadControlFormAction(formData: FormData): Promise<void> {
  const olympiadId = String(formData.get("olympiadId") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const map: Record<string, "SCHEDULED" | "PAUSED" | "ENDED"> = {
    pause: "PAUSED",
    resume: "SCHEDULED",
    end: "ENDED",
  };
  const status = map[intent];
  if (!status || !olympiadId) return;
  await setOlympiadStatusAction(olympiadId, status);
}

export async function publishOlympiadResultsFormAction(formData: FormData): Promise<void> {
  const id = String(formData.get("olympiadId") ?? "");
  if (id) await publishOlympiadResultsAction(id);
}

export async function setOlympiadStatusAction(
  olympiadId: string,
  status: "SCHEDULED" | "PAUSED" | "ENDED" | "DRAFT",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Kirish talab qilinadi." };
  try {
    await assertOlympiadManage(session, olympiadId);
  } catch {
    return { ok: false, error: "Ruxsat yo‘q." };
  }
  await prisma.olympiad.update({ where: { id: olympiadId }, data: { status } });
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "OLYMPIAD_STATUS",
    entityType: "Olympiad",
    entityId: olympiadId,
    metadata: { status },
  });
  revalidatePath(`/admin/oimpiadalar/${olympiadId}`);
  revalidatePath(`/oqituvchi/oimpiadalar/${olympiadId}`);
  revalidatePath("/admin/oimpiadalar");
  revalidatePath("/oqituvchi/oimpiadalar");
  return { ok: true };
}

export async function publishOlympiadResultsAction(
  olympiadId: string,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Kirish talab qilinadi." };
  try {
    await assertOlympiadManage(session, olympiadId);
  } catch {
    return { ok: false, error: "Ruxsat yo‘q." };
  }
  const now = new Date();
  const includeAuto = isOlympiadPublishIncludeAutoFinalized();
  // WHY: Count only — ranking runs in SQL so we never materialize all rows in Node.
  const count = await prisma.olympiadResult.count({ where: { olympiadId } });

  await prisma.$transaction(
    async (tx) => {
      await executeOlympiadPublishRankingInTx(tx, {
        olympiadId,
        includeAutoFinalized: includeAuto,
        approvedAt: now,
      });
      await tx.olympiad.update({
        where: { id: olympiadId },
        data: { resultsPublishedAt: now },
      });
    },
    { maxWait: 20_000, timeout: 120_000 },
  );
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "OLYMPIAD_RESULTS_PUBLISH",
    entityType: "Olympiad",
    entityId: olympiadId,
    metadata: {
      count,
      includeAutoFinalized: includeAuto,
      ranking: "sql_dense_rank_by_grade",
    },
  });
  revalidatePath(`/admin/oimpiadalar/${olympiadId}`);
  revalidatePath(`/oqituvchi/oimpiadalar/${olympiadId}`);
  return { ok: true, count };
}

export async function listOlympiadsForDashboard() {
  const session = await auth();
  if (!session?.user?.id) return [];
  if (!canOlympiadManage(session)) return [];

  if (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") {
    return prisma.olympiad.findMany({
      orderBy: { startsAt: "desc" },
      take: 120,
      include: {
        test: { select: { title: true } },
        _count: { select: { participants: true, sessions: true } },
      },
    });
  }
  if (session.user.role === "TEACHER") {
    return prisma.olympiad.findMany({
      where: {
        OR: [{ createdByUserId: session.user.id }, { responsibleUserId: session.user.id }],
      },
      orderBy: { startsAt: "desc" },
      take: 120,
      include: {
        test: { select: { title: true } },
        _count: { select: { participants: true, sessions: true } },
      },
    });
  }
  return [];
}

export async function getOlympiadAdminDetail(olympiadId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  try {
    await assertOlympiadManage(session, olympiadId);
  } catch {
    return null;
  }
  return prisma.olympiad.findUnique({
    where: { id: olympiadId },
    include: {
      test: { select: { id: true, title: true } },
      codes: { orderBy: { createdAt: "desc" }, take: 50 },
      _count: { select: { participants: true, sessions: true } },
    },
  });
}

export type OlympiadFinalizationInsights = {
  autoFinalizedCount: number;
  disconnectedTimeoutCount: number;
  manualAdminCount: number;
  overdueActiveCount: number;
  stuckSessions: {
    id: string;
    serverEndsAt: Date | null;
    lastSeenAt: Date;
    processingLock: string | null;
    participant: { firstName: string; lastName: string; gradeLabel: string };
  }[];
  recentWorkerRuns: { id: string; createdAt: Date; metadata: Record<string, unknown> }[];
  workerHeartbeat: OlympiadCronHeartbeatPayload | null;
};

export async function getOlympiadFinalizationInsights(olympiadId: string): Promise<OlympiadFinalizationInsights | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  try {
    await assertOlympiadManage(session, olympiadId);
  } catch {
    return null;
  }

  const now = new Date();
  const [autoFinalizedCount, disconnectedTimeoutCount, manualAdminCount, overdueActiveCount, stuckSessions, audits, workerHeartbeat] =
    await Promise.all([
      prisma.olympiadSession.count({ where: { olympiadId, autoFinalized: true } }),
      prisma.olympiadSession.count({
        where: { olympiadId, finalizationReason: OLYMPIAD_FINALIZATION_REASON.DISCONNECTED_TIMEOUT },
      }),
      prisma.olympiadSession.count({
        where: { olympiadId, finalizationReason: OLYMPIAD_FINALIZATION_REASON.MANUAL_ADMIN_FINALIZE },
      }),
      prisma.olympiadSession.count({
        where: { olympiadId, status: "ACTIVE", serverEndsAt: { lt: now } },
      }),
      prisma.olympiadSession.findMany({
        where: { olympiadId, status: "ACTIVE", serverEndsAt: { lt: now } },
        take: 20,
        orderBy: { serverEndsAt: "asc" },
        select: {
          id: true,
          serverEndsAt: true,
          lastSeenAt: true,
          processingLock: true,
          participant: { select: { firstName: true, lastName: true, gradeLabel: true } },
        },
      }),
      prisma.auditLog.findMany({
        where: { action: "OLYMPIAD_OVERDUE_FINALIZE_RUN" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, createdAt: true, metadataJson: true },
      }),
      readOlympiadFinalizeHeartbeat(),
    ]);

  const recentWorkerRuns = audits.map((a) => {
    let metadata: Record<string, unknown> = {};
    try {
      metadata = JSON.parse(a.metadataJson) as Record<string, unknown>;
    } catch {
      metadata = {};
    }
    return { id: a.id, createdAt: a.createdAt, metadata };
  });

  return {
    autoFinalizedCount,
    disconnectedTimeoutCount,
    manualAdminCount,
    overdueActiveCount,
    stuckSessions,
    recentWorkerRuns,
    workerHeartbeat,
  };
}

export async function manualFinalizeOlympiadSessionFormAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  const olympiadId = String(formData.get("olympiadId") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  const revalidatePrefix = String(formData.get("revalidatePrefix") ?? "/admin/oimpiadalar");
  const forceEvenIfNotOverdue = formData.get("forceEvenIfNotOverdue") === "on";
  if (!olympiadId || !sessionId) return;
  await assertOlympiadManage(session, olympiadId);
  const row = await prisma.olympiadSession.findFirst({
    where: { id: sessionId, olympiadId },
    select: { id: true },
  });
  if (!row) return;
  await runManualOlympiadSessionFinalization({
    sessionId,
    actorUserId: session.user.id,
    forceEvenIfNotOverdue,
  });
  revalidatePath(`${revalidatePrefix}/${olympiadId}`);
  revalidatePath(revalidatePrefix);
}

export async function issueOlympiadCertificatesFormAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  const olympiadId = String(formData.get("olympiadId") ?? "");
  const revalidatePrefix = String(formData.get("revalidatePrefix") ?? "/admin/oimpiadalar");
  if (!olympiadId) return;
  try {
    await assertOlympiadManage(session, olympiadId);
  } catch {
    return;
  }
  try {
    const stats = await issueCertificatesForOlympiad(olympiadId);
    await writeAuditLog({
      actorUserId: session.user.id,
      action: "OLYMPIAD_CERTIFICATES_ISSUED",
      entityType: "Olympiad",
      entityId: olympiadId,
      metadata: stats,
    });
  } catch (e) {
    await writeAuditLog({
      actorUserId: session.user.id,
      action: "OLYMPIAD_CERTIFICATES_ISSUE_FAILED",
      entityType: "Olympiad",
      entityId: olympiadId,
      metadata: { message: e instanceof Error ? e.message : String(e) },
    });
  }
  revalidatePath(`${revalidatePrefix}/${olympiadId}`);
  revalidatePath(revalidatePrefix);
}

export async function revokeOlympiadCertificateFormAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  const olympiadId = String(formData.get("olympiadId") ?? "");
  const verifyPublicId = String(formData.get("verifyPublicId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "Admin bekor qildi").trim();
  const revalidatePrefix = String(formData.get("revalidatePrefix") ?? "/admin/oimpiadalar");
  if (!olympiadId || !verifyPublicId) return;
  try {
    await assertOlympiadManage(session, olympiadId);
  } catch {
    return;
  }
  const out = await revokeCertificateByVerifyId(verifyPublicId, olympiadId, session.user.id, reason || "Admin bekor qildi");
  if (out.ok) {
    await writeAuditLog({
      actorUserId: session.user.id,
      action: "OLYMPIAD_CERTIFICATE_REVOKED",
      entityType: "Olympiad",
      entityId: olympiadId,
      metadata: { verifyPublicId },
    });
  }
  revalidatePath(`${revalidatePrefix}/${olympiadId}`);
  revalidatePath(revalidatePrefix);
}

const ADMIN_OLYMPIAD_RESULT_FILTER_MAX = 200;

function clampAdminResultFilter(raw: string | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return "";
  return t.length > ADMIN_OLYMPIAD_RESULT_FILTER_MAX ? t.slice(0, ADMIN_OLYMPIAD_RESULT_FILTER_MAX) : t;
}

export type AdminOlympiadResultRow = {
  id: string;
  rank: number | null;
  score: number | null;
  maxScore: number | null;
  published: boolean;
  olympiadId: string;
  olympiadTitle: string;
  firstName: string;
  lastName: string;
  gradeLabel: string;
  schoolName: string;
  timeSpentSec: number | null;
  submittedAt: string | null;
};

export async function listAdminOlympiadResultsTable(params: {
  olympiadId?: string;
  gradeLabel?: string;
  school?: string;
  name?: string;
  page: number;
  pageSize: number;
}): Promise<{ rows: AdminOlympiadResultRow[]; total: number; olympiadOptions: { id: string; title: string }[] } | null> {
  const session = await auth();
  if (!session?.user?.id || !canOlympiadManage(session)) return null;

  const page = Math.max(1, Math.floor(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize) || 25));

  const participantWhere: Prisma.OlympiadParticipantWhereInput = {};
  const g = clampAdminResultFilter(params.gradeLabel);
  const s = clampAdminResultFilter(params.school);
  const n = clampAdminResultFilter(params.name);
  if (g) participantWhere.gradeLabel = { contains: g, mode: "insensitive" };
  if (s) participantWhere.schoolName = { contains: s, mode: "insensitive" };
  if (n) {
    participantWhere.OR = [
      { firstName: { contains: n, mode: "insensitive" } },
      { lastName: { contains: n, mode: "insensitive" } },
    ];
  }

  const where: Prisma.OlympiadResultWhereInput = {};
  const oid = clampAdminResultFilter(params.olympiadId);
  if (oid) where.olympiadId = oid;

  if (session.user.role === "TEACHER") {
    where.olympiad = {
      OR: [{ createdByUserId: session.user.id }, { responsibleUserId: session.user.id }],
    };
  }

  if (Object.keys(participantWhere).length) where.participant = participantWhere;

  const olympiadWhere: Prisma.OlympiadWhereInput =
    session.user.role === "TEACHER"
      ? { OR: [{ createdByUserId: session.user.id }, { responsibleUserId: session.user.id }] }
      : {};

  const [total, rawRows, olympiadOptions] = await Promise.all([
    prisma.olympiadResult.count({ where }),
    prisma.olympiadResult.findMany({
      where,
      orderBy: [{ score: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        rank: true,
        score: true,
        maxScore: true,
        published: true,
        olympiadId: true,
        olympiad: { select: { title: true } },
        participant: { select: { firstName: true, lastName: true, gradeLabel: true, schoolName: true } },
        session: { select: { startedAt: true, submittedAt: true } },
      },
    }),
    prisma.olympiad.findMany({
      where: olympiadWhere,
      select: { id: true, title: true },
      orderBy: { startsAt: "desc" },
      // WHY: Cap options dropdown size — unbounded olympiad lists hurt TTFB for admins.
      take: 100,
    }),
  ]);

  const rows: AdminOlympiadResultRow[] = rawRows.map((r) => {
    const started = r.session.startedAt;
    const ended = r.session.submittedAt;
    const timeSpentSec =
      started && ended ? Math.max(0, Math.round((ended.getTime() - started.getTime()) / 1000)) : null;
    return {
      id: r.id,
      rank: r.rank,
      score: r.score,
      maxScore: r.maxScore,
      published: r.published,
      olympiadId: r.olympiadId,
      olympiadTitle: r.olympiad.title,
      firstName: r.participant.firstName,
      lastName: r.participant.lastName,
      gradeLabel: r.participant.gradeLabel,
      schoolName: r.participant.schoolName,
      timeSpentSec,
      submittedAt: ended?.toISOString() ?? null,
    };
  });

  return { total, rows, olympiadOptions };
}

function csvEscapeCell(v: string): string {
  if (/[",\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function exportAdminOlympiadResultsCsv(filters: {
  olympiadId?: string;
  gradeLabel?: string;
  school?: string;
  name?: string;
}): Promise<{ ok: true; csvText: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id || !canOlympiadManage(session)) return { ok: false, error: "Ruxsat yo‘q." };

  // WHY: Streaming pages avoids a single 5000-row `findMany` (memory + DB load) and caps worst-case export size.
  const MAX_CSV_ROWS = 2000;
  const PAGE_SIZE = 100;
  const header = ["Reyting", "Foiz", "Maks ball", "Ism", "Familiya", "Sinf", "Maktab", "Olimpiada", "Vaqt (s)", "E'lon"];
  const lines = [header.join(",")];
  let page = 1;
  let totalRows = 0;
  for (;;) {
    if (totalRows >= MAX_CSV_ROWS) break;
    const table = await listAdminOlympiadResultsTable({
      olympiadId: clampAdminResultFilter(filters.olympiadId),
      gradeLabel: clampAdminResultFilter(filters.gradeLabel),
      school: clampAdminResultFilter(filters.school),
      name: clampAdminResultFilter(filters.name),
      page,
      pageSize: PAGE_SIZE,
    });
    if (!table) return { ok: false, error: "Ma’lumot olinmadi." };
    if (!table.rows.length) break;
    for (const r of table.rows) {
      if (totalRows >= MAX_CSV_ROWS) break;
      lines.push(
        [
          csvEscapeCell(r.rank != null ? String(r.rank) : ""),
          csvEscapeCell(r.score != null ? String(r.score) : ""),
          csvEscapeCell(r.maxScore != null ? String(r.maxScore) : ""),
          csvEscapeCell(r.firstName),
          csvEscapeCell(r.lastName),
          csvEscapeCell(r.gradeLabel),
          csvEscapeCell(r.schoolName),
          csvEscapeCell(r.olympiadTitle),
          csvEscapeCell(r.timeSpentSec != null ? String(r.timeSpentSec) : ""),
          csvEscapeCell(r.published ? "ha" : "yo‘q"),
        ].join(","),
      );
      totalRows += 1;
    }
    if (table.rows.length < PAGE_SIZE) break;
    page += 1;
  }
  const csvText = "\uFEFF" + lines.join("\r\n");
  return { ok: true, csvText };
}
