"use server";

import { randomBytes } from "crypto";
import { cookies, headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { takeRateLimitSlot } from "@/lib/distributed-rate-limit";
import { isStrictDistributedRateLimitPolicy } from "@/lib/redis-strict-policy";
import { getClientIpFromHeaders, getRequestIdFromHeaders } from "@/lib/request-context";
import { logStructuredFromRequest } from "@/lib/logger";
import {
  OLYMPIAD_JOIN_RATE_MAX,
  OLYMPIAD_JOIN_RATE_WINDOW_MS,
  OLYMPIAD_SESSION_COOKIE,
  OLYMPIAD_VIOLATION_RL_MAX,
  OLYMPIAD_VIOLATION_RL_WINDOW_MS,
} from "@/lib/olympiad/constants";
import { generateSessionToken, hashOlympiadCode, hashSessionToken, normalizeOlympiadCode } from "@/lib/olympiad/code-crypto";
import { hashDeviceFingerprint, hashIp, hashUserAgent } from "@/lib/olympiad/ip-fp";
import { olympiadJoinSchema } from "@/lib/olympiad/schemas";
import { buildOptionPermutation, buildQuestionShuffle } from "@/lib/exam-shuffle";
import { scoreOlympiadAttempt, analyzeOlympiadAttemptAnswers } from "@/lib/olympiad/scoring";
import { isOlympiadAnswerSigningEnabled, isOlympiadExamWatermarkEnabled, isOlympiadMultiTabDetectionEnabled } from "@/lib/olympiad/feature-flags";
import { verifyOlympiadSignedAnswerPayload } from "@/lib/olympiad/verify-signed-exam-payload";
import type { OlympiadAnswerSigningPayload } from "@/lib/olympiad/exam-types";
import { olympiadCheatBreadcrumb } from "@/lib/olympiad/cheat-telemetry";
import { assertOlympiadExamStateTransition, isOlympiadExamTerminalStatus } from "@/lib/olympiad/exam-state-machine";
import { emitOlympiadMonitorEvent } from "@/lib/olympiad/olympiad-redis-events";
import { signSubmissionIntegrityV1, sha256HexUtf8, verifySubmissionIntegrityV1 } from "@/lib/olympiad/submission-integrity";
import * as Sentry from "@sentry/nextjs";

export type { OlympiadAnswerSigningPayload } from "@/lib/olympiad/exam-types";

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
  const requestId = await getRequestIdFromHeaders();
  const rl = await takeRateLimitSlot(
    "olympiad_join",
    ipHash,
    OLYMPIAD_JOIN_RATE_MAX,
    OLYMPIAD_JOIN_RATE_WINDOW_MS,
    { requireDistributed: isStrictDistributedRateLimitPolicy(), requestId },
  );
  if (!rl.ok) {
    void logStructuredFromRequest("warn", "olympiad.join_rate_limited", { ipHash: ipHash.slice(0, 8), backend: rl.backend });
    const msg =
      rl.backend === "redis_unavailable"
        ? "Tizim vaqtincha himoya rejimida. Iltimos, birozdan keyin qayta urinib ko‘ring."
        : "Juda ko‘p urinish. Birozdan keyin qayta urinib ko‘ring.";
    return { ok: false, error: msg, code: "RATE" };
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

  const ua = (await headers()).get("user-agent");
  const uaHash = hashUserAgent(ua);
  const fpHash = hashDeviceFingerprint(input.deviceFp);
  if (olymp.antiCheatStrictness === "STRICT" && !fpHash) {
    return { ok: false, error: "Qurilma identifikatori talab qilinadi (brauzerda JS yoqilgan bo‘lishi kerak).", code: "VALIDATION" };
  }

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

      if (olymp.participantLimit != null) {
        const cnt = await tx.olympiadParticipant.count({ where: { olympiadId: olymp.id } });
        if (cnt >= olymp.participantLimit) throw new Error("PARTICIPANT_LIMIT");
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
    if (String(e).includes("PARTICIPANT_LIMIT")) {
      return { ok: false, error: "Ishtirokchilar soni to‘ldi.", code: "NOT_FOUND" };
    }
    Sentry.captureException(e);
    return { ok: false, error: "Tizim xatosi. Keyinroq urinib ko‘ring.", code: "NOT_FOUND" };
  }
}

/** `useActionState` uchun (progressive enhancement: `form action`). */
export async function joinOlympiadFormAction(
  _prev: JoinOlympiadResult | null,
  formData: FormData,
): Promise<JoinOlympiadResult> {
  return joinOlympiad(formData);
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
    canTakeExam: canTakeExam && !isOlympiadExamTerminalStatus(row.status) && row.status !== "SUBMITTING",
    sessionId: row.id,
  };
}

export async function acceptOlympiadRules(): Promise<{ ok: boolean; error?: string }> {
  const row = await loadSessionByCookie();
  if (!row) return { ok: false, error: "Sessiya yo‘q." };
  if (row.status !== "RULES_PENDING") return { ok: true };
  const tr = assertOlympiadExamStateTransition(row.status, "WAITING");
  if (!tr.ok) return { ok: false, error: "Sessiya holati mos emas." };
  await prisma.olympiadSession.update({
    where: { id: row.id },
    data: { rulesAcceptedAt: new Date(), status: "WAITING" },
  });
  void emitOlympiadMonitorEvent({
    type: "exam_state_changed",
    olympiadId: row.olympiadId,
    sessionId: row.id,
    meta: { from: "RULES_PENDING", to: "WAITING" },
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
  if (isOlympiadExamTerminalStatus(row.status) || row.status === "EXPIRED") {
    return { ok: false, error: "Sessiya yopilgan." };
  }
  if (row.status === "ACTIVE" && row.attempt) {
    return { ok: true, sessionId: row.id };
  }

  const tr = assertOlympiadExamStateTransition(row.status, "ACTIVE");
  if (!tr.ok) {
    return { ok: false, error: "Sessiya holati imtihonni boshlashga mos emas." };
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

  void emitOlympiadMonitorEvent({
    type: "exam_state_changed",
    olympiadId: row.olympiadId,
    sessionId: row.id,
    meta: { to: "ACTIVE" },
  });

  return { ok: true, sessionId: row.id };
}

export async function olympiadAutosaveBatch(
  sessionId: string,
  items: Array<{ displayAnswers: number[]; signing?: OlympiadAnswerSigningPayload | null }>,
): Promise<{ ok: boolean; error?: string; appliedSeq?: number | null }> {
  if (!Array.isArray(items) || items.length === 0 || items.length > 15) {
    return { ok: false, error: "Noto‘g‘ri partiya." };
  }
  const row = await loadSessionByCookie();
  if (!row || row.id !== sessionId || row.status !== "ACTIVE") return { ok: false };
  if (row.serverEndsAt && Date.now() > row.serverEndsAt.getTime()) return { ok: false };

  const signingOn = isOlympiadAnswerSigningEnabled();
  let chosen: (typeof items)[number] | null = null;
  let chosenSigning: OlympiadAnswerSigningPayload | null | undefined;

  if (signingOn) {
    const withSeq = items.filter(
      (i) => i.signing && typeof i.signing.seq === "number" && Number.isInteger(i.signing.seq) && i.signing.seq >= 1,
    );
    if (!withSeq.length) return { ok: false, error: "Imzo ketma-ketligi yo‘q." };
    chosen = withSeq.reduce((a, b) => (a.signing!.seq > b.signing!.seq ? a : b));
    chosenSigning = chosen.signing ?? null;
  } else {
    chosen = items[items.length - 1]!;
    chosenSigning = chosen.signing ?? null;
  }

  const v = await verifyOlympiadSignedAnswerPayload(sessionId, chosen.displayAnswers, chosenSigning ?? null);
  if (!v.ok) return { ok: false, error: v.error };

  const ip = await getClientIpFromHeaders();
  const ipHash = hashIp(ip);
  if (row.lastIpHash && row.lastIpHash !== ipHash) {
    void olympiadLogViolation(sessionId, "IP_CHANGED", { prev: row.lastIpHash.slice(0, 8), next: ipHash.slice(0, 8) });
  }

  const attemptRow = await prisma.olympiadAttempt.findUnique({
    where: { sessionId: row.id },
    select: { id: true, answersJson: true, autosaveSeq: true },
  });
  if (!attemptRow) return { ok: false };
  const nextJson = JSON.stringify(chosen.displayAnswers);

  if (signingOn && chosenSigning) {
    if (chosenSigning.seq <= attemptRow.autosaveSeq) {
      if (attemptRow.answersJson === nextJson) {
        await prisma.olympiadSession.update({
          where: { id: row.id },
          data: { lastSeenAt: new Date(), lastIpHash: ipHash },
        });
        void emitOlympiadMonitorEvent({
          type: "autosave_received",
          olympiadId: row.olympiadId,
          sessionId: row.id,
          meta: { batch: items.length, stale: true, seq: chosenSigning.seq },
        });
        return { ok: true, appliedSeq: null };
      }
      return { ok: false, error: "Takroriy yoki eskirgan so‘rov." };
    }
  }

  if (attemptRow.answersJson === nextJson) {
    await prisma.olympiadSession.update({
      where: { id: row.id },
      data: { lastSeenAt: new Date(), lastIpHash: ipHash },
    });
    void emitOlympiadMonitorEvent({
      type: "autosave_received",
      olympiadId: row.olympiadId,
      sessionId: row.id,
      meta: { batch: items.length, noop: true, seq: chosenSigning?.seq },
    });
    return { ok: true, appliedSeq: chosenSigning?.seq ?? null };
  }

  if (signingOn && chosenSigning) {
    const updated = await prisma.olympiadAttempt.updateMany({
      where: { sessionId: row.id, autosaveSeq: { lt: chosenSigning.seq } },
      data: {
        answersJson: nextJson,
        lastAutoSavedAt: new Date(),
        autosaveSeq: chosenSigning.seq,
      },
    });
    if (updated.count === 0) {
      const cur = await prisma.olympiadAttempt.findUnique({
        where: { sessionId: row.id },
        select: { autosaveSeq: true, answersJson: true },
      });
      if (cur?.answersJson === nextJson) {
        await prisma.olympiadSession.update({
          where: { id: row.id },
          data: { lastSeenAt: new Date(), lastIpHash: ipHash },
        });
        void emitOlympiadMonitorEvent({
          type: "autosave_received",
          olympiadId: row.olympiadId,
          sessionId: row.id,
          meta: { batch: items.length, seq: chosenSigning.seq },
        });
        return { ok: true, appliedSeq: chosenSigning.seq };
      }
      return { ok: false, error: "Takroriy yoki eskirgan so‘rov." };
    }
  } else {
    await prisma.olympiadAttempt.update({
      where: { sessionId: row.id },
      data: {
        answersJson: nextJson,
        lastAutoSavedAt: new Date(),
      },
    });
  }
  await prisma.olympiadSession.update({
    where: { id: row.id },
    data: { lastSeenAt: new Date(), lastIpHash: ipHash },
  });
  void emitOlympiadMonitorEvent({
    type: "autosave_received",
    olympiadId: row.olympiadId,
    sessionId: row.id,
    meta: { batch: items.length, seq: chosenSigning?.seq },
  });
  return { ok: true, appliedSeq: chosenSigning?.seq ?? null };
}

export async function olympiadAutosaveAnswers(
  sessionId: string,
  displayAnswers: number[],
  signing?: OlympiadAnswerSigningPayload | null,
): Promise<{ ok: boolean; error?: string }> {
  const out = await olympiadAutosaveBatch(sessionId, [{ displayAnswers, signing }]);
  return out.ok ? { ok: true } : { ok: false, error: out.error };
}

export async function olympiadSubmit(
  sessionId: string,
  displayAnswers: number[],
  reason: "MANUAL" | "TIME" = "MANUAL",
  signing?: OlympiadAnswerSigningPayload | null,
): Promise<{ ok: true; score: number } | { ok: false; error: string }> {
  const row = await loadSessionByCookie();
  if (!row || row.id !== sessionId) return { ok: false, error: "Sessiya yo‘q." };

  const v = await verifyOlympiadSignedAnswerPayload(sessionId, displayAnswers, signing);
  if (!v.ok) return { ok: false, error: v.error };

  const signingOn = isOlympiadAnswerSigningEnabled();

  try {
    const score = await prisma.$transaction(
      async (tx) => {
        const locked = await tx.$queryRaw<Array<{ id: string; status: string; participantId: string; olympiadId: string }>>`
          SELECT id, status, "participantId", "olympiadId"
          FROM "OlympiadSession"
          WHERE id = ${sessionId}
          FOR UPDATE
        `;
        if (!locked.length) throw new Error("NO_SESSION");
        const st = locked[0]!;
        if (st.status === "SUBMITTED" || st.status === "FINALIZED") {
          const existing = await tx.olympiadResult.findUnique({
            where: { sessionId },
            select: { score: true },
          });
          return Number(existing?.score ?? 0);
        }
        if (st.status === "SUBMITTING") {
          const existingR = await tx.olympiadResult.findUnique({
            where: { sessionId },
            select: { score: true },
          });
          if (existingR) return Number(existingR.score ?? 0);
          throw new Error("SUBMIT_IN_PROGRESS");
        }
        if (st.status !== "ACTIVE") throw new Error("NOT_ACTIVE");

        const toSubmitting = await tx.olympiadSession.updateMany({
          where: { id: sessionId, status: "ACTIVE" },
          data: { status: "SUBMITTING" },
        });
        if (toSubmitting.count === 0) {
          const snap = await tx.olympiadSession.findFirst({
            where: { id: sessionId },
            select: { status: true },
          });
          if (snap?.status === "FINALIZED" || snap?.status === "SUBMITTED") {
            const existing = await tx.olympiadResult.findUnique({
              where: { sessionId },
              select: { score: true },
            });
            return Number(existing?.score ?? 0);
          }
          throw new Error("NOT_ACTIVE");
        }

        const attempt = await tx.olympiadAttempt.findUnique({
          where: { sessionId: row.id },
          include: {
            session: { include: { olympiad: true } },
          },
        });
        if (!attempt) throw new Error("NO_ATTEMPT");

        const now = new Date();
        if (reason === "MANUAL" && attempt.session.serverEndsAt && now > attempt.session.serverEndsAt) {
          throw new Error("TIMEOUT_MANUAL");
        }

        const test = await tx.test.findUnique({
          where: { id: attempt.session.olympiad.testId },
          include: { questions: { orderBy: { order: "asc" } } },
        });
        if (!test) throw new Error("NO_TEST");

        const order = JSON.parse(attempt.questionOrderJson) as string[];
        const perms = JSON.parse(attempt.optionPermutationsJson) as Record<string, number[]>;
        if (displayAnswers.length !== order.length) throw new Error("BAD_LEN");

        const { score, maxScore } = scoreOlympiadAttempt(order, perms, displayAnswers, test.questions);
        const publishedDefault = attempt.session.olympiad.resultVisibility === "IMMEDIATE";
        const answersJson = JSON.stringify(displayAnswers);

        if (signingOn && signing) {
          const updated = await tx.olympiadAttempt.updateMany({
            where: { sessionId, autosaveSeq: { lt: signing.seq } },
            data: {
              answersJson,
              lastAutoSavedAt: now,
              autosaveSeq: signing.seq,
            },
          });
          if (updated.count === 0) {
            const existingR = await tx.olympiadResult.findUnique({
              where: { sessionId },
              select: { score: true },
            });
            if (existingR) return Number(existingR.score ?? 0);
            throw new Error("REPLAY_OR_STALE");
          }
        } else {
          await tx.olympiadAttempt.update({
            where: { id: attempt.id },
            data: { answersJson, lastAutoSavedAt: now },
          });
        }

        const integrity = signSubmissionIntegrityV1({
          v: 1,
          sessionId: row.id,
          olympiadId: st.olympiadId,
          participantId: st.participantId,
          score,
          maxScore,
          answersSha256: sha256HexUtf8(answersJson),
          finalizedAtIso: now.toISOString(),
        });

        await tx.olympiadSession.update({
          where: { id: row.id },
          data: {
            status: "FINALIZED",
            submittedAt: now,
            finalizedAt: now,
            finalizationReason: null,
            autoFinalized: false,
            processingLock: null,
            processingStartedAt: null,
          },
        });

        try {
          await tx.olympiadResult.create({
            data: {
              sessionId: row.id,
              participantId: st.participantId,
              olympiadId: st.olympiadId,
              score,
              maxScore,
              published: publishedDefault,
              approvedAt: publishedDefault ? now : null,
              answersJson,
              finalizedAt: now,
              finalizationReason: null,
              autoFinalized: false,
              submissionIntegritySig: integrity?.sigHex ?? null,
              submissionCanonicalSha256: integrity?.canonicalSha256 ?? null,
            },
          });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            const existingR = await tx.olympiadResult.findUnique({
              where: { sessionId },
              select: { score: true },
            });
            if (existingR) return Number(existingR.score ?? 0);
          }
          throw e;
        }

        return score;
      },
      { maxWait: 10_000, timeout: 25_000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    void emitOlympiadMonitorEvent({
      type: "exam_state_changed",
      olympiadId: row.olympiadId,
      sessionId,
      meta: { to: "FINALIZED", reason },
    });
    return { ok: true, score };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "TIMEOUT_MANUAL") return { ok: false, error: "Vaqt tugagan." };
    if (msg === "SUBMIT_IN_PROGRESS") return { ok: false, error: "Yuborish jarayoni tugaguncha kuting." };
    if (msg === "NOT_ACTIVE") return { ok: false, error: "Sessiya faol emas." };
    if (msg === "BAD_LEN") return { ok: false, error: "Javoblar soni noto‘g‘ri." };
    if (msg === "NO_ATTEMPT") return { ok: false, error: "Urinish topilmadi." };
    if (msg === "NO_TEST") return { ok: false, error: "Test yo‘q." };
    if (msg === "REPLAY_OR_STALE") return { ok: false, error: "Takroriy yoki eskirgan yuborish." };
    Sentry.captureException(e);
    return { ok: false, error: "Yuborishda xato." };
  }
}

export async function olympiadLogViolation(
  sessionId: string,
  type: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  const row = await loadSessionByCookie();
  if (!row || row.id !== sessionId) return;
  if (row.status !== "ACTIVE" && row.status !== "SUBMITTING") return;
  const requestId = await getRequestIdFromHeaders();
  const rl = await takeRateLimitSlot(
    "olympiad_violation",
    `${row.id}:${type}`,
    OLYMPIAD_VIOLATION_RL_MAX,
    OLYMPIAD_VIOLATION_RL_WINDOW_MS,
    { requireDistributed: isStrictDistributedRateLimitPolicy(), requestId },
  );
  if (!rl.ok) return;

  olympiadCheatBreadcrumb(sessionId, type, detail);
  const strict = row.olympiad.antiCheatStrictness === "STRICT";
  const incRaw =
    type === "VISIBILITY_HIDDEN" || type === "TAB_HIDDEN" || type === "FULLSCREEN_EXIT"
      ? strict
        ? 3
        : 1
      : 1;
  const inc = Math.min(incRaw, 3);
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
  void emitOlympiadMonitorEvent({
    type: "violation_logged",
    olympiadId: row.olympiadId,
    sessionId: row.id,
    meta: { violationType: type },
  });
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
      signingMode: "off" | "seq";
      enableExamWatermark: boolean;
      watermarkText: string | null;
      enableMultiTabDetect: boolean;
      /** `OLYMPIAD_ANSWER_SIGNING=1` bo‘lsa: client `seq` shu qiymatdan yuqori bo‘lishi kerak. */
      serverAutosaveSeq: number;
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

  const signingMode: "off" | "seq" = isOlympiadAnswerSigningEnabled() ? "seq" : "off";

  let watermarkText: string | null = null;
  if (isOlympiadExamWatermarkEnabled()) {
    const shortTitle = row.olympiad.title.length > 40 ? `${row.olympiad.title.slice(0, 40)}…` : row.olympiad.title;
    watermarkText = `${shortTitle} · ${sessionId.slice(0, 10)}…`;
  }

  return {
    ok: true,
    title: test.title,
    questions,
    serverEndsAt: row.serverEndsAt?.toISOString() ?? null,
    serverNow: new Date().toISOString(),
    antiCheatStrictness: row.olympiad.antiCheatStrictness,
    initialAnswers: saved.slice(0, questions.length),
    signingMode,
    enableExamWatermark: isOlympiadExamWatermarkEnabled(),
    watermarkText,
    enableMultiTabDetect: isOlympiadMultiTabDetectionEnabled(),
    serverAutosaveSeq: attempt.autosaveSeq,
  };
}

export async function verifyCurrentOlympiadSubmissionIntegrity(): Promise<
  | { ok: false; error: string }
  | { ok: true; valid: boolean; reason?: string; hasIntegrityFields: boolean }
> {
  const row = await loadSessionByCookie();
  if (!row) return { ok: false, error: "Sessiya yo‘q." };
  const result = await prisma.olympiadResult.findUnique({
    where: { sessionId: row.id },
    select: {
      olympiadId: true,
      participantId: true,
      score: true,
      maxScore: true,
      answersJson: true,
      finalizedAt: true,
      createdAt: true,
      submissionIntegritySig: true,
      submissionCanonicalSha256: true,
    },
  });
  if (!result) return { ok: true, valid: false, reason: "no_result", hasIntegrityFields: false };
  if (!result.submissionIntegritySig || !result.submissionCanonicalSha256) {
    return { ok: true, valid: false, reason: "unsigned", hasIntegrityFields: false };
  }
  const finalizedAtIso = result.finalizedAt?.toISOString() ?? result.createdAt.toISOString();
  const answersJson = result.answersJson ?? "[]";
  const valid = verifySubmissionIntegrityV1(
    {
      v: 1,
      sessionId: row.id,
      olympiadId: result.olympiadId,
      participantId: result.participantId,
      score: result.score ?? 0,
      maxScore: result.maxScore ?? 0,
      answersSha256: sha256HexUtf8(answersJson),
      finalizedAtIso,
    },
    result.submissionIntegritySig,
    result.submissionCanonicalSha256,
  );
  return { ok: true, valid, hasIntegrityFields: true };
}

export async function getOlympiadPostSubmitState(): Promise<
  | { ok: false; error: string }
  | {
      ok: true;
      sessionId: string;
      status: string;
      title: string;
      submittedAt: string | null;
      result: null | {
        score: number;
        maxScore: number | null;
        published: boolean;
        rank: number | null;
        certificate: null | {
          verifyPublicId: string;
          pdfUrl: string | null;
          revokedAt: string | null;
        };
        earnedPoints: number | null;
        percentScore: number | null;
        answeredCount: number | null;
        questionCount: number | null;
        timeSpentSec: number | null;
        schoolName: string | null;
        gradeLabel: string | null;
        perQuestion: { index: number; text: string; maxPoints: number; earnedPoints: number; correct: boolean }[];
      };
    }
> {
  const row = await loadSessionByCookie();
  if (!row) return { ok: false, error: "Sessiya topilmadi." };
  const result = await prisma.olympiadResult.findUnique({
    where: { sessionId: row.id },
    select: {
      score: true,
      maxScore: true,
      published: true,
      rank: true,
      answersJson: true,
      certificate: { select: { verifyPublicId: true, pdfUrl: true, revokedAt: true } },
    },
  });

  let enriched: null | {
    score: number;
    maxScore: number | null;
    published: boolean;
    rank: number | null;
    certificate: null | {
      verifyPublicId: string;
      pdfUrl: string | null;
      revokedAt: string | null;
    };
    earnedPoints: number | null;
    percentScore: number | null;
    answeredCount: number | null;
    questionCount: number | null;
    timeSpentSec: number | null;
    schoolName: string | null;
    gradeLabel: string | null;
    perQuestion: { index: number; text: string; maxPoints: number; earnedPoints: number; correct: boolean }[];
  } = null;

  if (result) {
    const base = {
      score: result.score ?? 0,
      maxScore: result.maxScore,
      published: result.published,
      rank: result.rank,
      certificate: result.certificate
        ? {
            verifyPublicId: result.certificate.verifyPublicId ?? "",
            pdfUrl: result.certificate.revokedAt ? null : (result.certificate.pdfUrl ?? null),
            revokedAt: result.certificate.revokedAt?.toISOString() ?? null,
          }
        : null,
      earnedPoints: null as number | null,
      percentScore: null as number | null,
      answeredCount: null as number | null,
      questionCount: null as number | null,
      timeSpentSec: null as number | null,
      schoolName: row.participant.schoolName,
      gradeLabel: row.participant.gradeLabel,
      perQuestion: [] as { index: number; text: string; maxPoints: number; earnedPoints: number; correct: boolean }[],
    };

    const timeSpentSec =
      row.startedAt && row.submittedAt
        ? Math.max(0, Math.round((row.submittedAt.getTime() - row.startedAt.getTime()) / 1000))
        : null;
    base.timeSpentSec = timeSpentSec;

    if (row.attempt && result.answersJson) {
      const test = await prisma.test.findUnique({
        where: { id: row.olympiad.testId },
        include: { questions: { orderBy: { order: "asc" } } },
      });
      if (test) {
        try {
          const order = JSON.parse(row.attempt.questionOrderJson) as string[];
          const permsRaw = row.attempt.optionPermutationsJson?.trim();
          const perms = (permsRaw ? JSON.parse(permsRaw) : {}) as Record<string, number[]>;
          const displayAnswers = JSON.parse(result.answersJson) as number[];
          const analysis = analyzeOlympiadAttemptAnswers(order, perms, displayAnswers, test.questions);
          base.earnedPoints = analysis.earnedPoints;
          base.percentScore = analysis.percentScore;
          base.answeredCount = analysis.answeredCount;
          base.questionCount = order.length;
          const rows = analysis.rows.map((q, i) => ({
            index: i + 1,
            text: q.text.length > 140 ? `${q.text.slice(0, 140)}…` : q.text,
            maxPoints: q.maxPoints,
            earnedPoints: q.earnedPoints,
            correct: q.correct,
          }));
          rows.sort((a, b) => a.index - b.index);
          base.perQuestion = rows;
        } catch {
          base.perQuestion = [];
        }
      }
    }

    enriched = base;
  }

  return {
    ok: true,
    sessionId: row.id,
    status: row.status,
    title: row.olympiad.title,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    result: enriched,
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
