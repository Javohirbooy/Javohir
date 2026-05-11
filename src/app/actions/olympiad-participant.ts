"use server";

import { randomBytes } from "crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { takeRateLimitSlot } from "@/lib/distributed-rate-limit";
import { getClientIpFromHeaders } from "@/lib/request-context";
import { logStructuredFromRequest } from "@/lib/logger";
import {
  OLYMPIAD_JOIN_RATE_MAX,
  OLYMPIAD_JOIN_RATE_WINDOW_MS,
  OLYMPIAD_SESSION_COOKIE,
} from "@/lib/olympiad/constants";
import { generateSessionToken, hashOlympiadCode, hashSessionToken, normalizeOlympiadCode } from "@/lib/olympiad/code-crypto";
import { hashDeviceFingerprint, hashIp, hashUserAgent } from "@/lib/olympiad/ip-fp";
import { olympiadJoinSchema } from "@/lib/olympiad/schemas";
import { buildOptionPermutation, buildQuestionShuffle } from "@/lib/exam-shuffle";
import { scoreOlympiadAttempt } from "@/lib/olympiad/scoring";
import * as Sentry from "@sentry/nextjs";

function rng() {
  return randomBytes(4).readUInt32LE(0) / 0xffffffff;
}

async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(OLYMPIAD_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 10,
  });
}

export type JoinOlympiadResult =
  | { ok: true }
  | { ok: false; error: string; code?: "RATE" | "VALIDATION" | "NOT_FOUND" };

export async function joinOlympiad(formData: FormData): Promise<JoinOlympiadResult> {
  const raw = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    gradeLabel: String(formData.get("gradeLabel") ?? ""),
    age: formData.get("age"),
    schoolName: String(formData.get("schoolName") ?? ""),
    region: String(formData.get("region") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    accessCode: String(formData.get("accessCode") ?? ""),
    deviceFp: String(formData.get("deviceFp") ?? ""),
    website: String(formData.get("website") ?? ""),
  };

  if (raw.website.trim()) {
    return { ok: false, error: "So‘rov qabul qilinmadi.", code: "NOT_FOUND" };
  }

  const parsed = olympiadJoinSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    const first = Object.values(msg)[0]?.[0] ?? "Ma’lumotlarni tekshiring.";
    return { ok: false, error: first, code: "VALIDATION" };
  }
  const input = parsed.data;

  const ip = await getClientIpFromHeaders();
  const ipHash = hashIp(ip);
  const rl = await takeRateLimitSlot(
    "olympiad_join",
    ipHash,
    OLYMPIAD_JOIN_RATE_MAX,
    OLYMPIAD_JOIN_RATE_WINDOW_MS,
    { requireDistributed: false },
  );
  if (!rl.ok) {
    void logStructuredFromRequest("warn", "olympiad.join_rate_limited", { ipHash: ipHash.slice(0, 8) });
    return { ok: false, error: "Juda ko‘p urinish. Birozdan keyin qayta urinib ko‘ring.", code: "RATE" };
  }

  const norm = normalizeOlympiadCode(input.accessCode);
  const codeHash = hashOlympiadCode(norm);

  const codeRow = await prisma.olympiadCode.findFirst({
    where: { codeHash, isActive: true },
    include: {
      olympiad: {
        include: { test: { select: { id: true, isActive: true, status: true, isDraft: true } } },
      },
    },
  });

  if (!codeRow) {
    await prisma.olympiadInvalidCodeAttempt.create({
      data: { codeHash, ipHash },
    });
    return { ok: false, error: "Kod noto‘g‘ri yoki olimpiada hozir ochilmagan.", code: "NOT_FOUND" };
  }

  const olymp = codeRow.olympiad;
  const now = new Date();
  if (olymp.status === "ENDED" || olymp.status === "DRAFT" || olymp.status === "PAUSED") {
    return { ok: false, error: "Bu olimpiada hozir ochilmagan.", code: "NOT_FOUND" };
  }
  if (codeRow.expiresAt && now > codeRow.expiresAt) {
    return { ok: false, error: "Kod muddati tugagan.", code: "NOT_FOUND" };
  }
  if (codeRow.maxUses != null && codeRow.usesCount >= codeRow.maxUses) {
    return { ok: false, error: "Kod limiti tugagan.", code: "NOT_FOUND" };
  }
  if (!olymp.test.isActive || olymp.test.isDraft || olymp.test.status !== "PUBLISHED") {
    return { ok: false, error: "Test hozir mavjud emas.", code: "NOT_FOUND" };
  }

  if (olymp.participantLimit != null) {
    const cnt = await prisma.olympiadParticipant.count({ where: { olympiadId: olymp.id } });
    if (cnt >= olymp.participantLimit) {
      return { ok: false, error: "Ishtirokchilar soni to‘ldi.", code: "NOT_FOUND" };
    }
  }

  const ua = (await headers()).get("user-agent");
  const uaHash = hashUserAgent(ua);
  const fpHash = hashDeviceFingerprint(input.deviceFp);

  try {
    const token = generateSessionToken();
    const tokenHash = hashSessionToken(token);

    await prisma.$transaction(async (tx) => {
      if (fpHash) {
        const open = await tx.olympiadSession.findFirst({
          where: {
            olympiadId: olymp.id,
            status: { in: ["RULES_PENDING", "WAITING", "ACTIVE"] },
            participant: { deviceFpHash: fpHash },
          },
          select: { id: true },
        });
        if (open) throw new Error("DUPLICATE_DEVICE");
      }

      const participant = await tx.olympiadParticipant.create({
        data: {
          olympiadId: olymp.id,
          codeId: codeRow.id,
          firstName: input.firstName,
          lastName: input.lastName,
          gradeLabel: input.gradeLabel,
          age: input.age,
          schoolName: input.schoolName,
          region: input.region,
          phone: input.phone,
          deviceFpHash: fpHash,
        },
      });

      await tx.olympiadSession.create({
        data: {
          olympiadId: olymp.id,
          participantId: participant.id,
          sessionTokenHash: tokenHash,
          status: "RULES_PENDING",
          lastIpHash: ipHash,
          userAgentHash: uaHash,
        },
      });

      await tx.olympiadCode.update({
        where: { id: codeRow.id },
        data: { usesCount: { increment: 1 } },
      });
    });

    await setSessionCookie(token);
    return { ok: true };
  } catch (e) {
    if (String(e).includes("DUPLICATE_DEVICE")) {
      return { ok: false, error: "Bu qurilmadan allaqachon ro‘yxatdan o‘tilgan.", code: "NOT_FOUND" };
    }
    Sentry.captureException(e);
    return { ok: false, error: "Tizim xatosi. Keyinroq urinib ko‘ring.", code: "NOT_FOUND" };
  }
}

async function loadSessionByCookie() {
  const jar = await cookies();
  const raw = jar.get(OLYMPIAD_SESSION_COOKIE)?.value;
  if (!raw) return null;
  const h = hashSessionToken(raw);
  return prisma.olympiadSession.findFirst({
    where: { sessionTokenHash: h },
    include: {
      olympiad: true,
      participant: true,
      attempt: true,
    },
  });
}

/** Server pages: cookie bilan joriy olimpiada sessiyasi (auth cookie bilan aralashmaydi). */
export async function getOlympiadSessionForCurrentCookie() {
  return loadSessionByCookie();
}

export type OlympiadGateState =
  | { ok: false; error: string }
  | {
      ok: true;
      olympiadTitle: string;
      sessionStatus: string;
      startsAt: string;
      endsAt: string | null;
      serverNow: string;
      durationMinutes: number;
      antiCheatStrictness: string;
      canEnterWaiting: boolean;
      canTakeExam: boolean;
      sessionId: string;
    };

export async function getOlympiadGateState(): Promise<OlympiadGateState> {
  const row = await loadSessionByCookie();
  if (!row) return { ok: false, error: "Sessiya topilmadi. Qayta ro‘yxatdan o‘ting." };
  const now = Date.now();
  const start = row.olympiad.startsAt.getTime();
  const end = row.olympiad.endsAt?.getTime() ?? null;
  const rulesOk = Boolean(row.rulesAcceptedAt);
  const paused = row.olympiad.status === "PAUSED" || row.olympiad.status === "ENDED" || row.olympiad.status === "DRAFT";
  const canEnterWaiting = rulesOk && !paused && row.status === "RULES_PENDING";
  const canTakeExam =
    rulesOk &&
    !paused &&
    (row.status === "WAITING" || row.status === "ACTIVE") &&
    now >= start &&
    (end == null || now <= end);

  return {
    ok: true,
    olympiadTitle: row.olympiad.title,
    sessionStatus: row.status,
    startsAt: row.olympiad.startsAt.toISOString(),
    endsAt: row.olympiad.endsAt?.toISOString() ?? null,
    serverNow: new Date(now).toISOString(),
    durationMinutes: row.olympiad.durationMinutes,
    antiCheatStrictness: row.olympiad.antiCheatStrictness,
    canEnterWaiting,
    canTakeExam: canTakeExam && row.status !== "SUBMITTED",
    sessionId: row.id,
  };
}

export async function acceptOlympiadRules(): Promise<{ ok: boolean; error?: string }> {
  const row = await loadSessionByCookie();
  if (!row) return { ok: false, error: "Sessiya yo‘q." };
  if (row.status !== "RULES_PENDING") return { ok: true };
  await prisma.olympiadSession.update({
    where: { id: row.id },
    data: { rulesAcceptedAt: new Date(), status: "WAITING" },
  });
  return { ok: true };
}

export async function beginOlympiadExam(): Promise<
  { ok: true; sessionId: string } | { ok: false; error: string }
> {
  const row = await loadSessionByCookie();
  if (!row) return { ok: false, error: "Sessiya yo‘q." };
  if (!row.rulesAcceptedAt) return { ok: false, error: "Avval qoidalarga rozilik bering." };
  if (row.olympiad.status === "PAUSED" || row.olympiad.status === "ENDED" || row.olympiad.status === "DRAFT") {
    return { ok: false, error: "Olimpiada to‘xtatilgan yoki tayyorlanmoqda." };
  }
  const now = new Date();
  if (now.getTime() < row.olympiad.startsAt.getTime()) {
    return { ok: false, error: "Boshlanish vaqti kelmagan." };
  }
  if (row.olympiad.endsAt && now.getTime() > row.olympiad.endsAt.getTime()) {
    return { ok: false, error: "Olimpiada tugagan." };
  }
  if (row.status === "SUBMITTED" || row.status === "EXPIRED") {
    return { ok: false, error: "Sessiya yopilgan." };
  }
  if (row.status === "ACTIVE" && row.attempt) {
    return { ok: true, sessionId: row.id };
  }

  const test = await prisma.test.findUnique({
    where: { id: row.olympiad.testId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!test?.questions.length) return { ok: false, error: "Test mavjud emas." };

  const qids = test.questions.map((q) => q.id);
  const order = buildQuestionShuffle(qids, row.olympiad.shuffleQuestions, rng);
  const perms: Record<string, number[]> = {};
  const byId = new Map(test.questions.map((q) => [q.id, q]));
  for (const qid of order) {
    const q = byId.get(qid);
    if (!q) continue;
    const opts = JSON.parse(q.optionsJson) as string[];
    perms[qid] = buildOptionPermutation(opts.length, row.olympiad.shuffleOptions, rng);
  }

  const durMs = row.olympiad.durationMinutes * 60 * 1000;
  let serverEnds = new Date(now.getTime() + durMs);
  if (row.olympiad.endsAt && row.olympiad.endsAt.getTime() < serverEnds.getTime()) {
    serverEnds = row.olympiad.endsAt;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.olympiadAttempt.create({
        data: {
          sessionId: row.id,
          questionOrderJson: JSON.stringify(order),
          optionPermutationsJson: JSON.stringify(perms),
          answersJson: JSON.stringify(order.map(() => -1)),
        },
      });
      await tx.olympiadSession.update({
        where: { id: row.id },
        data: {
          status: "ACTIVE",
          startedAt: now,
          serverEndsAt: serverEnds,
        },
      });
    });
  } catch {
    const again = await prisma.olympiadSession.findFirst({
      where: { id: row.id },
      include: { attempt: true },
    });
    if (again?.status === "ACTIVE" && again.attempt) {
      return { ok: true, sessionId: row.id };
    }
    return { ok: false, error: "Testni boshlashda xato." };
  }

  return { ok: true, sessionId: row.id };
}

export async function olympiadAutosaveAnswers(sessionId: string, displayAnswers: number[]): Promise<{ ok: boolean }> {
  const row = await loadSessionByCookie();
  if (!row || row.id !== sessionId || row.status !== "ACTIVE") return { ok: false };
  if (row.serverEndsAt && Date.now() > row.serverEndsAt.getTime()) return { ok: false };
  const ip = await getClientIpFromHeaders();
  const ipHash = hashIp(ip);
  if (row.lastIpHash && row.lastIpHash !== ipHash) {
    void olympiadLogViolation(sessionId, "IP_CHANGED", { prev: row.lastIpHash.slice(0, 8), next: ipHash.slice(0, 8) });
  }
  await prisma.olympiadAttempt.update({
    where: { sessionId: row.id },
    data: {
      answersJson: JSON.stringify(displayAnswers),
      lastAutoSavedAt: new Date(),
    },
  });
  await prisma.olympiadSession.update({
    where: { id: row.id },
    data: { lastSeenAt: new Date(), lastIpHash: ipHash },
  });
  return { ok: true };
}

export async function olympiadSubmit(
  sessionId: string,
  displayAnswers: number[],
  reason: "MANUAL" | "TIME" = "MANUAL",
): Promise<{ ok: true; score: number } | { ok: false; error: string }> {
  const row = await loadSessionByCookie();
  if (!row || row.id !== sessionId) return { ok: false, error: "Sessiya yo‘q." };
  if (row.status !== "ACTIVE") return { ok: false, error: "Sessiya faol emas." };
  const attempt = await prisma.olympiadAttempt.findUnique({
    where: { sessionId: row.id },
    include: {
      session: { include: { olympiad: true } },
    },
  });
  if (!attempt) return { ok: false, error: "Urinish topilmadi." };

  const now = new Date();
  if (reason === "MANUAL" && attempt.session.serverEndsAt && now > attempt.session.serverEndsAt) {
    return { ok: false, error: "Vaqt tugagan." };
  }

  const test = await prisma.test.findUnique({
    where: { id: row.olympiad.testId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!test) return { ok: false, error: "Test yo‘q." };

  const order = JSON.parse(attempt.questionOrderJson) as string[];
  const perms = JSON.parse(attempt.optionPermutationsJson) as Record<string, number[]>;
  if (displayAnswers.length !== order.length) {
    return { ok: false, error: "Javoblar soni noto‘g‘ri." };
  }

  const { score, maxScore } = scoreOlympiadAttempt(order, perms, displayAnswers, test.questions);

  const publishedDefault = row.olympiad.resultVisibility === "IMMEDIATE";

  await prisma.$transaction(async (tx) => {
    await tx.olympiadAttempt.update({
      where: { id: attempt.id },
      data: { answersJson: JSON.stringify(displayAnswers), lastAutoSavedAt: now },
    });
    await tx.olympiadSession.update({
      where: { id: row.id },
      data: {
        status: "SUBMITTED",
        submittedAt: now,
        finalizedAt: now,
        finalizationReason: null,
        autoFinalized: false,
        processingLock: null,
        processingStartedAt: null,
      },
    });
    await tx.olympiadResult.create({
      data: {
        sessionId: row.id,
        participantId: row.participantId,
        olympiadId: row.olympiadId,
        score,
        maxScore,
        published: publishedDefault,
        approvedAt: publishedDefault ? now : null,
        answersJson: JSON.stringify(displayAnswers),
        finalizedAt: now,
        finalizationReason: null,
        autoFinalized: false,
      },
    });
  });

  return { ok: true, score };
}

export async function olympiadLogViolation(
  sessionId: string,
  type: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  const row = await loadSessionByCookie();
  if (!row || row.id !== sessionId || row.status !== "ACTIVE") return;
  const strict = row.olympiad.antiCheatStrictness === "STRICT";
  const inc =
    type === "VISIBILITY_HIDDEN" || type === "TAB_HIDDEN" || type === "FULLSCREEN_EXIT"
      ? strict
        ? 3
        : 1
      : 1;
  await prisma.$transaction([
    prisma.olympiadViolation.create({
      data: {
        sessionId: row.id,
        type,
        detailJson: JSON.stringify({ ...detail, at: new Date().toISOString() }),
      },
    }),
    prisma.olympiadSession.update({
      where: { id: row.id },
      data: {
        suspiciousScore: { increment: inc },
        warningCount: { increment: 1 },
        lastSeenAt: new Date(),
      },
    }),
  ]);
}

export async function getOlympiadExamPayload(sessionId: string): Promise<
  | { ok: false; error: string }
  | {
      ok: true;
      title: string;
      questions: { id: string; text: string; options: string[] }[];
      serverEndsAt: string | null;
      serverNow: string;
      antiCheatStrictness: string;
      initialAnswers: number[];
    }
> {
  const row = await loadSessionByCookie();
  if (!row || row.id !== sessionId) return { ok: false, error: "Sessiya yo‘q." };
  if (row.status !== "ACTIVE") return { ok: false, error: "Faol emas." };
  const attempt = await prisma.olympiadAttempt.findUnique({ where: { sessionId: row.id } });
  if (!attempt) return { ok: false, error: "Urinish yo‘q." };

  const ip = await getClientIpFromHeaders();
  const ipHash = hashIp(ip);
  if (row.lastIpHash && row.lastIpHash !== ipHash) {
    void olympiadLogViolation(sessionId, "IP_CHANGED", { prev: row.lastIpHash.slice(0, 8), next: ipHash.slice(0, 8) });
  }
  await prisma.olympiadSession.update({
    where: { id: row.id },
    data: { lastSeenAt: new Date(), lastIpHash: ipHash },
  });

  const test = await prisma.test.findUnique({
    where: { id: row.olympiad.testId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!test) return { ok: false, error: "Test yo‘q." };
  const order = JSON.parse(attempt.questionOrderJson) as string[];
  const perms = JSON.parse(attempt.optionPermutationsJson) as Record<string, number[]>;
  const byId = new Map(test.questions.map((q) => [q.id, q]));
  const questions: { id: string; text: string; options: string[] }[] = [];
  for (const qid of order) {
    const q = byId.get(qid);
    if (!q) continue;
    const opts = JSON.parse(q.optionsJson) as string[];
    const perm = perms[qid] ?? opts.map((_, i) => i);
    const shown = perm.map((ci) => opts[ci]!);
    questions.push({ id: q.id, text: q.text, options: shown });
  }

  const saved = attempt.answersJson ? (JSON.parse(attempt.answersJson) as number[]) : questions.map(() => -1);
  while (saved.length < questions.length) saved.push(-1);

  return {
    ok: true,
    title: test.title,
    questions,
    serverEndsAt: row.serverEndsAt?.toISOString() ?? null,
    serverNow: new Date().toISOString(),
    antiCheatStrictness: row.olympiad.antiCheatStrictness,
    initialAnswers: saved.slice(0, questions.length),
  };
}

export async function getOlympiadPostSubmitState(): Promise<
  | { ok: false; error: string }
  | {
      ok: true;
      sessionId: string;
      status: string;
      title: string;
      submittedAt: string | null;
      result: null | { score: number; maxScore: number | null; published: boolean; rank: number | null };
    }
> {
  const row = await loadSessionByCookie();
  if (!row) return { ok: false, error: "Sessiya yo‘q." };
  const result = await prisma.olympiadResult.findUnique({
    where: { sessionId: row.id },
    select: { score: true, maxScore: true, published: true, rank: true },
  });
  return {
    ok: true,
    sessionId: row.id,
    status: row.status,
    title: row.olympiad.title,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    result: result
      ? {
          score: result.score ?? 0,
          maxScore: result.maxScore,
          published: result.published,
          rank: result.rank,
        }
      : null,
  };
}

export async function syncOlympiadTimer(
  sessionId: string,
): Promise<{ ok: false; error: string } | { ok: true; serverNow: string; serverEndsAt: string | null }> {
  const row = await loadSessionByCookie();
  if (!row || row.id !== sessionId) return { ok: false, error: "Sessiya yo‘q." };
  return {
    ok: true,
    serverNow: new Date().toISOString(),
    serverEndsAt: row.serverEndsAt?.toISOString() ?? null,
  };
}
