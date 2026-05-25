"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { OLYMPIAD_BUNDLE_COOKIE, OLYMPIAD_SESSION_COOKIE } from "@/lib/olympiad/constants";
import { generateSessionToken, hashSessionToken } from "@/lib/olympiad/code-crypto";
import { setOlympiadSessionCookie } from "@/lib/olympiad/session-cookie";
import { hashIp, hashUserAgent } from "@/lib/olympiad/ip-fp";
import { headers } from "next/headers";
import { getClientIpFromHeaders } from "@/lib/request-context";
import { buildBundleDashboard } from "@/lib/olympiad/bundle-dashboard";
import {
  assignBundleVariantsForParticipant,
  parseParticipantAssignedOlympiadIds,
} from "@/lib/olympiad/bundle-variant-assign";
import { recomputeBundleAttemptScores } from "@/lib/olympiad/bundle-aggregate";
import type { BundleCombinedResult, BundleDashboardPayload } from "@/lib/olympiad/bundle-types";
import { isOlympiadExamTerminalStatus } from "@/lib/olympiad/exam-state-machine";
import { olympiadResultToPoints } from "@/lib/olympiad/result-points";

async function setBundleCookie(token: string) {
  const jar = await cookies();
  jar.set(OLYMPIAD_BUNDLE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

const setSessionCookie = setOlympiadSessionCookie;

export async function loadBundleAttemptByCookie() {
  const jar = await cookies();
  const raw = jar.get(OLYMPIAD_BUNDLE_COOKIE)?.value;
  if (!raw) return null;
  const h = hashSessionToken(raw);
  return prisma.olympiadBundleAttempt.findFirst({
    where: { accessTokenHash: h },
    select: { id: true, bundleId: true, completedAt: true },
  });
}

export async function getBundleDashboardForCookie(): Promise<
  { ok: false; error: string } | { ok: true; data: BundleDashboardPayload }
> {
  const attempt = await loadBundleAttemptByCookie();
  if (!attempt) return { ok: false, error: "Paket sessiyasi topilmadi." };
  const data = await buildBundleDashboard(attempt.id);
  if (!data) return { ok: false, error: "Paket topilmadi." };
  return { ok: true, data };
}

export async function startBundleSubject(olympiadId: string): Promise<
  { ok: false; error: string } | { ok: true; redirectTo: string }
> {
  const bundleAttempt = await loadBundleAttemptByCookie();
  if (!bundleAttempt) return { ok: false, error: "Avval paket kodini kiriting." };

  const link = await prisma.olympiadBundleSubject.findFirst({
    where: { bundleId: bundleAttempt.bundleId, olympiadId },
    select: {
      olympiad: {
        select: {
          id: true,
          status: true,
          test: { select: { isActive: true, isDraft: true, status: true } },
        },
      },
    },
  });
  if (!link) return { ok: false, error: "Bu fan ushbu paketga tegishli emas." };

  const bundleMeta = await prisma.olympiadBundle.findUnique({
    where: { id: bundleAttempt.bundleId },
    select: { startsAt: true, endsAt: true, isActive: true },
  });
  if (!bundleMeta?.isActive) return { ok: false, error: "Paket faol emas." };
  const now = new Date();
  if (now < bundleMeta.startsAt) return { ok: false, error: "Paket hali boshlanmagan." };
  if (bundleMeta.endsAt && now > bundleMeta.endsAt) return { ok: false, error: "Paket muddati tugagan." };

  if (link.olympiad.status === "ENDED" || link.olympiad.status === "DRAFT" || link.olympiad.status === "PAUSED") {
    return { ok: false, error: "Bu fan hozir ochilmagan." };
  }
  if (!link.olympiad.test.isActive || link.olympiad.test.isDraft || link.olympiad.test.status !== "PUBLISHED") {
    return { ok: false, error: "Test mavjud emas." };
  }

  const dashboard = await buildBundleDashboard(bundleAttempt.id);
  if (!dashboard) return { ok: false, error: "Paket topilmadi." };
  const card = dashboard.subjects.find((s) => s.olympiadId === olympiadId);
  if (!card) return { ok: false, error: "Fan topilmadi." };
  if (card.status === "LOCKED") return { ok: false, error: "Avval oldingi fanni yakunlang." };
  if (card.status === "COMPLETED" && card.sessionId) {
    return { ok: true, redirectTo: "/olympiada/bundle" };
  }

  const bp = await prisma.olympiadBundleParticipant.findFirst({
    where: {
      attempts: { some: { id: bundleAttempt.id } },
    },
    select: {
      id: true,
      bundleId: true,
      assignedOlympiadIdsJson: true,
      firstName: true,
      lastName: true,
      gradeLabel: true,
      age: true,
      schoolName: true,
      region: true,
      phone: true,
      deviceFpHash: true,
    },
  });
  if (!bp) return { ok: false, error: "Ishtirokchi topilmadi." };

  const assignedIds = parseParticipantAssignedOlympiadIds(bp.assignedOlympiadIdsJson);
  if (assignedIds.length > 0 && !assignedIds.includes(olympiadId)) {
    return { ok: false, error: "Bu variant sizga biriktirilmagan." };
  }

  const ip = await getClientIpFromHeaders();
  const ipHash = hashIp(ip);
  const ua = (await headers()).get("user-agent");
  const uaHash = hashUserAgent(ua);

  let existing = await prisma.olympiadSession.findFirst({
    where: { bundleAttemptId: bundleAttempt.id, olympiadId },
    select: { id: true, status: true, sessionTokenHash: true },
  });

  if (existing && isOlympiadExamTerminalStatus(existing.status)) {
    return { ok: true, redirectTo: "/olympiada/bundle" };
  }

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);

  if (!existing) {
    let participant = await prisma.olympiadParticipant.findFirst({
      where: { olympiadId, bundleParticipantId: bp.id },
      select: { id: true },
    });
    if (!participant) {
      participant = await prisma.olympiadParticipant.create({
        data: {
          olympiadId,
          bundleParticipantId: bp.id,
          firstName: bp.firstName,
          lastName: bp.lastName,
          gradeLabel: bp.gradeLabel,
          age: bp.age,
          schoolName: bp.schoolName,
          region: bp.region,
          phone: bp.phone,
          deviceFpHash: bp.deviceFpHash,
        },
        select: { id: true },
      });
    }

    existing = await prisma.olympiadSession.create({
      data: {
        olympiadId,
        participantId: participant.id,
        bundleAttemptId: bundleAttempt.id,
        sessionTokenHash: tokenHash,
        status: "RULES_PENDING",
        lastIpHash: ipHash,
        userAgentHash: uaHash,
      },
      select: { id: true, status: true, sessionTokenHash: true },
    });
    await setSessionCookie(token);
    return { ok: true, redirectTo: "/olympiada/rules" };
  }

  await prisma.olympiadSession.update({
    where: { id: existing.id },
    data: { lastIpHash: ipHash, userAgentHash: uaHash },
  });

  const jar = await cookies();
  const rawCookie = jar.get(OLYMPIAD_SESSION_COOKIE)?.value;
  const cookieMatches =
    rawCookie && hashSessionToken(rawCookie) === existing.sessionTokenHash;
  if (!cookieMatches) {
    const rawToken = generateSessionToken();
    await prisma.olympiadSession.update({
      where: { id: existing.id },
      data: { sessionTokenHash: hashSessionToken(rawToken) },
    });
    await setSessionCookie(rawToken);
  }

  if (existing.status === "WAITING") return { ok: true, redirectTo: "/olympiada/waiting-room" };
  if (existing.status === "ACTIVE" || existing.status === "SUBMITTING") {
    return { ok: true, redirectTo: `/olympiada/test/${existing.id}` };
  }
  return { ok: true, redirectTo: "/olympiada/rules" };
}

/** Submitdan keyin paket ballarini yangilash (fire-and-forget chaqiriladi). */
export async function syncBundleAfterSubjectSubmit(sessionId: string): Promise<void> {
  const sess = await prisma.olympiadSession.findUnique({
    where: { id: sessionId },
    select: { bundleAttemptId: true },
  });
  if (!sess?.bundleAttemptId) return;
  await recomputeBundleAttemptScores(sess.bundleAttemptId);
}

export async function getBundleCombinedResults(): Promise<
  { ok: false; error: string } | { ok: true; data: BundleCombinedResult }
> {
  const attempt = await loadBundleAttemptByCookie();
  if (!attempt) return { ok: false, error: "Sessiya topilmadi." };

  const row = await prisma.olympiadBundleAttempt.findUnique({
    where: { id: attempt.id },
    select: {
      totalScore: true,
      totalMaxScore: true,
      overallRank: true,
      classRank: true,
      schoolRank: true,
      bundle: { select: { title: true } },
      bundleParticipant: { select: { firstName: true, lastName: true, schoolName: true, gradeLabel: true } },
      sessions: {
        select: {
          olympiadId: true,
          result: {
            select: {
              score: true,
              maxScore: true,
              rank: true,
              certificate: { select: { medal: true } },
            },
          },
        },
      },
    },
  });
  if (!row) return { ok: false, error: "Paket topilmadi." };

  const dashboard = await buildBundleDashboard(attempt.id);
  if (!dashboard) return { ok: false, error: "Paket topilmadi." };

  const resultByOlympiad = new Map(row.sessions.map((s) => [s.olympiadId, s.result]));

  const subjectPoints = dashboard.subjects.map((sub) => {
    const r = resultByOlympiad.get(sub.olympiadId);
    const pts = olympiadResultToPoints(r?.score ?? sub.score, r?.maxScore ?? sub.maxScore);
    return {
      olympiadId: sub.olympiadId,
      title: sub.title,
      score: pts.earnedPoints,
      maxScore: pts.maxPoints,
      percent: pts.percent,
      rank: r?.rank ?? null,
      medal: r?.certificate?.medal ?? null,
    };
  });

  await recomputeBundleAttemptScores(attempt.id);

  const totals = await buildBundleDashboard(attempt.id);
  const totalScore = totals?.totalScore ?? 0;
  const totalMaxScore = totals?.totalMaxScore ?? 0;
  const combinedPercent =
    totalMaxScore > 0 ? Math.min(100, Math.round((totalScore / totalMaxScore) * 1000) / 10) : 0;

  const rankRow = await prisma.olympiadBundleAttempt.findUnique({
    where: { id: attempt.id },
    select: {
      overallRank: true,
      classRank: true,
      schoolRank: true,
    },
  });

  return {
    ok: true,
    data: {
      bundleTitle: row.bundle.title,
      studentName: `${row.bundleParticipant.firstName} ${row.bundleParticipant.lastName}`.trim(),
      schoolName: row.bundleParticipant.schoolName,
      gradeLabel: row.bundleParticipant.gradeLabel,
      totalScore,
      totalMaxScore,
      combinedPercent,
      overallRank: rankRow?.overallRank ?? row.overallRank,
      classRank: rankRow?.classRank ?? row.classRank,
      schoolRank: rankRow?.schoolRank ?? row.schoolRank,
      subjects: subjectPoints,
    },
  };
}

async function resumeBundleAttempt(
  attemptId: string,
): Promise<{ ok: true; bundleToken: string } | { ok: false; error: string }> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  await prisma.olympiadBundleAttempt.update({
    where: { id: attemptId },
    data: { accessTokenHash: tokenHash },
  });
  await setBundleCookie(token);
  return { ok: true, bundleToken: token };
}

export async function joinBundleFromParticipantInput(args: {
  bundleId: string;
  firstName: string;
  lastName: string;
  gradeLabel: string;
  age: number;
  schoolName: string;
  region: string;
  phone?: string;
  deviceFpHash?: string;
}): Promise<{ ok: true; bundleToken: string } | { ok: false; error: string }> {
  const bundle = await prisma.olympiadBundle.findUnique({
    where: { id: args.bundleId },
    select: { id: true, isActive: true, startsAt: true, endsAt: true },
  });
  if (!bundle || !bundle.isActive) return { ok: false, error: "Paket topilmadi." };
  const now = new Date();
  if (now < bundle.startsAt) return { ok: false, error: "Paket hali boshlanmagan." };
  if (bundle.endsAt && now > bundle.endsAt) return { ok: false, error: "Paket muddati tugagan." };

  const cookieAttempt = await loadBundleAttemptByCookie();
  if (cookieAttempt?.bundleId === args.bundleId) {
    return { ok: true, bundleToken: "" };
  }

  if (args.deviceFpHash) {
    const norm = (s: string) => s.trim().toLowerCase();
    const byDevice = await prisma.olympiadBundleParticipant.findMany({
      where: { bundleId: args.bundleId, deviceFpHash: args.deviceFpHash },
      select: {
        firstName: true,
        lastName: true,
        gradeLabel: true,
        schoolName: true,
        attempts: { select: { id: true }, take: 1 },
      },
      take: 10,
    });
    const samePerson = byDevice.find(
      (p) =>
        norm(p.firstName) === norm(args.firstName) &&
        norm(p.lastName) === norm(args.lastName) &&
        norm(p.gradeLabel) === norm(args.gradeLabel) &&
        norm(p.schoolName) === norm(args.schoolName) &&
        p.attempts[0],
    );
    if (samePerson?.attempts[0]) {
      return resumeBundleAttempt(samePerson.attempts[0].id);
    }
  }

  const nameMatches = await prisma.olympiadBundleParticipant.findMany({
    where: {
      bundleId: args.bundleId,
      firstName: { equals: args.firstName.trim(), mode: "insensitive" },
      lastName: { equals: args.lastName.trim(), mode: "insensitive" },
    },
    select: {
      id: true,
      gradeLabel: true,
      schoolName: true,
      deviceFpHash: true,
      attempts: { select: { id: true }, take: 1 },
    },
    take: 20,
  });

  const norm = (s: string) => s.trim().toLowerCase();
  const existing = nameMatches.find(
    (p) =>
      norm(p.gradeLabel) === norm(args.gradeLabel) &&
      norm(p.schoolName) === norm(args.schoolName) &&
      p.attempts[0],
  );

  if (existing?.attempts[0]) {
    if (args.deviceFpHash && !existing.deviceFpHash) {
      await prisma.olympiadBundleParticipant.update({
        where: { id: existing.id },
        data: { deviceFpHash: args.deviceFpHash },
      });
    }
    return resumeBundleAttempt(existing.attempts[0].id);
  }

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);

  await prisma.$transaction(async (tx) => {
    const bp = await tx.olympiadBundleParticipant.create({
      data: {
        bundleId: args.bundleId,
        firstName: args.firstName.trim(),
        lastName: args.lastName.trim(),
        gradeLabel: args.gradeLabel.trim(),
        age: args.age,
        schoolName: args.schoolName.trim(),
        region: args.region.trim(),
        phone: args.phone,
        deviceFpHash: args.deviceFpHash,
      },
    });
    await assignBundleVariantsForParticipant(tx, args.bundleId, bp.id);
    await tx.olympiadBundleAttempt.create({
      data: {
        bundleId: args.bundleId,
        bundleParticipantId: bp.id,
        accessTokenHash: tokenHash,
      },
    });
  });

  await setBundleCookie(token);
  return { ok: true, bundleToken: token };
}
