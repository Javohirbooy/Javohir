import { prisma } from "@/lib/prisma";
import { readOlympiadFinalizeHeartbeat } from "@/lib/worker/olympiad-cron-heartbeat";
import { isUpstashConfigured } from "@/lib/upstash-redis";
import { isStrictDistributedRateLimitPolicy } from "@/lib/redis-strict-policy";
import { OLYMPIAD_SUSPICIOUS_SCORE_ALERT_THRESHOLD } from "@/lib/olympiad/constants";

export async function getAdminOlympiadRiskSnapshot() {
  const now = new Date();
  const [totalNonDraft, overdueActive, suspiciousSessions, certificatesIssued, invalidAttempts24h] = await Promise.all([
    prisma.olympiad.count({ where: { status: { not: "DRAFT" } } }),
    prisma.olympiadSession.count({
      where: { status: "ACTIVE", serverEndsAt: { lt: now } },
    }),
    prisma.olympiadSession.count({ where: { suspiciousScore: { gte: OLYMPIAD_SUSPICIOUS_SCORE_ALERT_THRESHOLD } } }),
    prisma.olympiadCertificate.count({ where: { issuedAt: { not: null }, revokedAt: null } }),
    prisma.olympiadInvalidCodeAttempt.count({
      where: { createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    }),
  ]);
  const heartbeat = await readOlympiadFinalizeHeartbeat();
  return {
    totalNonDraft,
    overdueActive,
    suspiciousSessions,
    certificatesIssued,
    invalidAttempts24h,
    heartbeat,
    redisConfigured: isUpstashConfigured(),
    rateLimitStrict: isStrictDistributedRateLimitPolicy(),
  };
}

export async function getTeacherOlympiadSummary(teacherUserId: string) {
  const rows = await prisma.olympiad.findMany({
    where: {
      OR: [{ createdByUserId: teacherUserId }, { responsibleUserId: teacherUserId }],
    },
    orderBy: { startsAt: "desc" },
    take: 8,
    select: {
      id: true,
      title: true,
      status: true,
      startsAt: true,
      resultsPublishedAt: true,
      _count: { select: { participants: true, sessions: true } },
    },
  });
  const pendingPublish = await prisma.olympiad.count({
    where: {
      OR: [{ createdByUserId: teacherUserId }, { responsibleUserId: teacherUserId }],
      resultsPublishedAt: null,
      status: { notIn: ["DRAFT", "ENDED"] },
    },
  });
  const activeParticipants = await prisma.olympiadSession.count({
    where: {
      status: { in: ["ACTIVE", "WAITING"] },
      olympiad: {
        OR: [{ createdByUserId: teacherUserId }, { responsibleUserId: teacherUserId }],
      },
    },
  });
  const certs = await prisma.olympiadCertificate.count({
    where: {
      revokedAt: null,
      result: {
        olympiad: {
          OR: [{ createdByUserId: teacherUserId }, { responsibleUserId: teacherUserId }],
        },
      },
    },
  });
  return { rows, pendingPublish, certs, activeParticipants };
}

export async function getSuperAdminOlympiadSystemSnapshot() {
  const now = new Date();
  const [olympiads, participants, invalid7d] = await Promise.all([
    prisma.olympiad.count(),
    prisma.olympiadParticipant.count(),
    prisma.olympiadInvalidCodeAttempt.count({
      where: { createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ]);
  const heartbeat = await readOlympiadFinalizeHeartbeat();
  return {
    olympiads,
    participants,
    invalidAttempts7d: invalid7d,
    heartbeat,
    redisConfigured: isUpstashConfigured(),
    rateLimitStrict: isStrictDistributedRateLimitPolicy(),
  };
}
