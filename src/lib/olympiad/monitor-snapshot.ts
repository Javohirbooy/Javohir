import { prisma } from "@/lib/prisma";
import { OLYMPIAD_SUSPICIOUS_SCORE_ALERT_THRESHOLD } from "@/lib/olympiad/constants";
import { isOlympiadExamTerminalStatus } from "@/lib/olympiad/exam-state-machine";

const DISCONNECT_MS = 45_000;

export type OlympiadMonitorParticipantRow = {
  sessionId: string;
  status: "active" | "disconnected" | "suspicious";
  participant: { firstName: string; lastName: string; gradeLabel: string };
  sessionStatus: string;
  warningCount: number;
  suspiciousScore: number;
  lastSeenAt: string;
  serverEndsAt: string | null;
  submittedAt: string | null;
  violations: { type: string; at: string }[];
  /** Ko‘p fanli paket sessiyasi bo‘lsa — fanlar progressi */
  bundleProgress: string | null;
};

export type OlympiadMonitorSnapshot = {
  serverNow: string;
  olympiad: {
    title: string;
    startsAt: string;
    endsAt: string | null;
    status: string;
    durationMinutes: number;
    resultsPublishedAt: string | null;
  } | null;
  participants: OlympiadMonitorParticipantRow[];
  pagination: { takeSessions: number; takeViolations: number; nextCursor: string | null };
};

function parseMonitorCursor(raw: string | null | undefined): { at: Date; id: string } | null {
  if (!raw?.trim()) return null;
  const i = raw.indexOf("|");
  if (i < 1) return null;
  const at = new Date(raw.slice(0, i));
  const id = raw.slice(i + 1).trim();
  if (!id || Number.isNaN(at.getTime())) return null;
  return { at, id };
}

/**
 * Jonli monitor uchun DB snapshot (GET / SSE ikkalasi ham shu yerdan).
 */
export async function getOlympiadMonitorSnapshot(params: {
  olympiadId: string;
  takeSessions: number;
  takeViolations: number;
  cursor?: string | null;
}): Promise<OlympiadMonitorSnapshot> {
  const { olympiadId, takeSessions, takeViolations } = params;
  const now = Date.now();
  const c = parseMonitorCursor(params.cursor);

  const [rows, olympiad] = await Promise.all([
    prisma.olympiadSession.findMany({
      where: {
        olympiadId,
        ...(c
          ? {
              OR: [{ lastSeenAt: { lt: c.at } }, { AND: [{ lastSeenAt: c.at }, { id: { lt: c.id } }] }],
            }
          : {}),
      },
      include: {
        participant: { select: { firstName: true, lastName: true, gradeLabel: true } },
        violations: { orderBy: { createdAt: "desc" }, take: takeViolations },
      },
      orderBy: [{ lastSeenAt: "desc" }, { id: "desc" }],
      take: takeSessions + 1,
    }),
    prisma.olympiad.findUnique({
      where: { id: olympiadId },
      select: {
        title: true,
        startsAt: true,
        endsAt: true,
        status: true,
        durationMinutes: true,
        resultsPublishedAt: true,
      },
    }),
  ]);

  const hasMore = rows.length > takeSessions;
  const page = hasMore ? rows.slice(0, takeSessions) : rows;
  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? `${last.lastSeenAt.toISOString()}|${last.id}` : null;

  const bundleAttemptIds = [...new Set(page.map((r) => r.bundleAttemptId).filter((id): id is string => !!id))];
  const bundleProgressByAttempt = new Map<string, string>();
  if (bundleAttemptIds.length > 0) {
    const attempts = await prisma.olympiadBundleAttempt.findMany({
      where: { id: { in: bundleAttemptIds } },
      select: {
        id: true,
        bundle: { select: { _count: { select: { subjects: true } } } },
        sessions: { select: { status: true } },
      },
    });
    for (const a of attempts) {
      const total = a.bundle._count.subjects;
      const done = a.sessions.filter((s) => isOlympiadExamTerminalStatus(s.status)).length;
      bundleProgressByAttempt.set(a.id, `${done}/${total}`);
    }
  }

  const participants: OlympiadMonitorParticipantRow[] = page.map((r) => {
    const disconnected = now - r.lastSeenAt.getTime() > DISCONNECT_MS;
    let status: "active" | "disconnected" | "suspicious" = "active";
    if (disconnected && (r.status === "ACTIVE" || r.status === "WAITING" || r.status === "SUBMITTING")) {
      status = "disconnected";
    }
    if (r.suspiciousScore >= OLYMPIAD_SUSPICIOUS_SCORE_ALERT_THRESHOLD || r.warningCount >= OLYMPIAD_SUSPICIOUS_SCORE_ALERT_THRESHOLD) {
      status = "suspicious";
    }
    return {
      sessionId: r.id,
      status,
      participant: r.participant,
      sessionStatus: r.status,
      warningCount: r.warningCount,
      suspiciousScore: r.suspiciousScore,
      lastSeenAt: r.lastSeenAt.toISOString(),
      serverEndsAt: r.serverEndsAt?.toISOString() ?? null,
      submittedAt: r.submittedAt?.toISOString() ?? null,
      violations: r.violations.map((v) => ({
        type: v.type,
        at: v.createdAt.toISOString(),
      })),
      bundleProgress: r.bundleAttemptId ? (bundleProgressByAttempt.get(r.bundleAttemptId) ?? null) : null,
    };
  });

  return {
    serverNow: new Date().toISOString(),
    olympiad: olympiad
      ? {
          title: olympiad.title,
          startsAt: olympiad.startsAt.toISOString(),
          endsAt: olympiad.endsAt?.toISOString() ?? null,
          status: olympiad.status,
          durationMinutes: olympiad.durationMinutes,
          resultsPublishedAt: olympiad.resultsPublishedAt?.toISOString() ?? null,
        }
      : null,
    participants,
    pagination: { takeSessions, takeViolations, nextCursor },
  };
}
