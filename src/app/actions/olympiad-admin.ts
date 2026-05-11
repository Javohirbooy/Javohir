"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sessionHasPermission } from "@/lib/permissions";
import { assertOlympiadManage } from "@/lib/olympiad/authz";
import {
  codeHintFromNormalized,
  hashOlympiadCode,
  normalizeOlympiadCode,
} from "@/lib/olympiad/code-crypto";
import { writeAuditLog } from "@/lib/audit";
import { runManualOlympiadSessionFinalization } from "@/lib/olympiad/finalize-overdue-worker";
import { OLYMPIAD_FINALIZATION_REASON } from "@/lib/olympiad/finalization-constants";
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
  startsAt: z.string().min(1),
  endsAt: z.string().optional().nullable(),
  durationMinutes: z.coerce.number().int().min(5).max(300),
  participantLimit: z.coerce.number().int().min(1).max(100_000).optional().nullable(),
  antiCheatStrictness: z.enum(["OFF", "STANDARD", "STRICT"]),
  resultVisibility: z.enum(["IMMEDIATE", "DELAYED"]),
});

export async function getTestsEligibleForOlympiad() {
  const session = await auth();
  if (!session?.user?.id) return [];
  if (!sessionHasPermission(session, "OLYMPIAD_MANAGE")) return [];

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
  if (!sessionHasPermission(session, "OLYMPIAD_MANAGE")) return { ok: false, error: "Ruxsat yo‘q." };

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || null,
    testId: formData.get("testId"),
    responsibleUserId: formData.get("responsibleUserId") || null,
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt") || null,
    durationMinutes: formData.get("durationMinutes"),
    participantLimit: formData.get("participantLimit") || null,
    antiCheatStrictness: formData.get("antiCheatStrictness") ?? "STANDARD",
    resultVisibility: formData.get("resultVisibility") ?? "DELAYED",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().fieldErrors.title?.[0] ?? "Ma’lumotlar noto‘g‘ri." };
  }
  const v = parsed.data;
  const shuffleQuestions = formData.get("shuffleQuestions") === "on";
  const shuffleOptions = formData.get("shuffleOptions") === "on";
  const startsAt = new Date(v.startsAt);
  const endsAt = v.endsAt ? new Date(v.endsAt) : null;
  if (Number.isNaN(startsAt.getTime())) return { ok: false, error: "Boshlanish vaqti noto‘g‘ri." };
  if (endsAt && Number.isNaN(endsAt.getTime())) return { ok: false, error: "Yakun vaqti noto‘g‘ri." };
  if (endsAt && endsAt <= startsAt) return { ok: false, error: "Yakun boshlanishdan keyin bo‘lishi kerak." };

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
  const results = await prisma.olympiadResult.findMany({
    where: { olympiadId },
    orderBy: [{ score: "desc" }, { id: "asc" }],
    select: { id: true },
  });
  let rank = 1;
  await prisma.$transaction(async (tx) => {
    for (const r of results) {
      await tx.olympiadResult.update({
        where: { id: r.id },
        data: { rank, published: true, approvedAt: now },
      });
      rank += 1;
    }
    await tx.olympiad.update({
      where: { id: olympiadId },
      data: { resultsPublishedAt: now },
    });
  });
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "OLYMPIAD_RESULTS_PUBLISH",
    entityType: "Olympiad",
    entityId: olympiadId,
    metadata: { count: results.length },
  });
  revalidatePath(`/admin/oimpiadalar/${olympiadId}`);
  revalidatePath(`/oqituvchi/oimpiadalar/${olympiadId}`);
  return { ok: true, count: results.length };
}

export async function exportOlympiadResultsCsv(olympiadId: string): Promise<
  { ok: true; csv: string; filename: string } | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Kirish talab qilinadi." };
  try {
    await assertOlympiadManage(session, olympiadId);
  } catch {
    return { ok: false, error: "Ruxsat yo‘q." };
  }
  const olymp = await prisma.olympiad.findUnique({
    where: { id: olympiadId },
    select: { title: true, slug: true },
  });
  if (!olymp) return { ok: false, error: "Topilmadi." };

  const rows = await prisma.olympiadResult.findMany({
    where: { olympiadId },
    include: {
      participant: {
        select: {
          firstName: true,
          lastName: true,
          gradeLabel: true,
          schoolName: true,
          region: true,
        },
      },
    },
    orderBy: [{ rank: "asc" }, { score: "desc" }],
  });

  const header = ["rank", "score", "maxScore", "firstName", "lastName", "grade", "school", "region", "published"];
  const lines = [header.join(",")];
  for (const r of rows) {
    const p = r.participant;
    lines.push(
      [
        r.rank ?? "",
        r.score ?? "",
        r.maxScore ?? "",
        csvEscape(p.firstName),
        csvEscape(p.lastName),
        csvEscape(p.gradeLabel),
        csvEscape(p.schoolName),
        csvEscape(p.region),
        r.published ? "1" : "0",
      ].join(","),
    );
  }
  const csv = lines.join("\n");
  const filename = `olympiad-${olymp.slug}-results.csv`;
  return { ok: true, csv, filename };
}

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function listOlympiadsForDashboard() {
  const session = await auth();
  if (!session?.user?.id) return [];
  if (!sessionHasPermission(session, "OLYMPIAD_MANAGE")) return [];

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
  const [autoFinalizedCount, disconnectedTimeoutCount, manualAdminCount, overdueActiveCount, stuckSessions, audits] =
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
