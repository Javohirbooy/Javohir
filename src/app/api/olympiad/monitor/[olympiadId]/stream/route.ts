import { auth } from "@/auth";
import { wrapRouteHandlerWithSentry } from "@sentry/nextjs";
import { assertOlympiadMonitorAccess } from "@/lib/olympiad/authz";
import {
  isOlympiadMonitorDbSnapshotSparseEnabled,
  isOlympiadMonitorRedisEventsEnabled,
  isOlympiadMonitorSseEnabled,
} from "@/lib/olympiad/feature-flags";
import { getOlympiadMonitorSnapshot } from "@/lib/olympiad/monitor-snapshot";
import { readOlympiadReadModelCounters, readRecentOlympiadMonitorEvents } from "@/lib/olympiad/olympiad-redis-events";
import { OLYMPIAD_SUSPICIOUS_SCORE_ALERT_THRESHOLD } from "@/lib/olympiad/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SNAPSHOT_SESSIONS = 100;
const SNAPSHOT_VIOLATIONS = 6;
const TICK_MS = 8000;

/**
 * SSE: to‘liq snapshot (kam-tezlikli) + yengil pulse (sonlar).
 * `OLYMPIAD_MONITOR_SSE=1` bo‘lmaganda 404.
 */
async function getImpl(req: Request, ctx: { params: Promise<{ olympiadId: string }> }) {
  if (!isOlympiadMonitorSseEnabled()) {
    return new Response(JSON.stringify({ error: "sse_disabled" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }
  const session = await auth();
  const { olympiadId } = await ctx.params;
  try {
    await assertOlympiadMonitorAccess(session, olympiadId);
  } catch {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };
      let iv: ReturnType<typeof setInterval> | undefined;
      const close = () => {
        if (iv) clearInterval(iv);
        iv = undefined;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      send({ type: "hello", olympiadId, serverNow: new Date().toISOString() });

      let tickCount = 0;
      const tick = async () => {
        tickCount += 1;
        const sparse = isOlympiadMonitorDbSnapshotSparseEnabled();
        const redisEv = isOlympiadMonitorRedisEventsEnabled();
        const fullSnap = !sparse || !redisEv || tickCount === 1 || tickCount % 5 === 0;

        if (redisEv) {
          try {
            const [events, readModel] = await Promise.all([
              readRecentOlympiadMonitorEvents(olympiadId, 48),
              readOlympiadReadModelCounters(olympiadId),
            ]);
            send({
              type: "events",
              serverNow: new Date().toISOString(),
              events,
              readModel,
            });
          } catch {
            send({ type: "events", serverNow: new Date().toISOString(), events: [], readModel: null });
          }
        }

        if (!fullSnap) return;

        try {
          const [snap, active, suspicious, violations24h] = await Promise.all([
            getOlympiadMonitorSnapshot({
              olympiadId,
              takeSessions: SNAPSHOT_SESSIONS,
              takeViolations: SNAPSHOT_VIOLATIONS,
            }),
            prisma.olympiadSession.count({ where: { olympiadId, status: { in: ["ACTIVE", "WAITING", "SUBMITTING"] } } }),
            prisma.olympiadSession.count({
              where: { olympiadId, suspiciousScore: { gte: OLYMPIAD_SUSPICIOUS_SCORE_ALERT_THRESHOLD } },
            }),
            prisma.olympiadViolation.count({
              where: {
                session: { olympiadId },
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
              },
            }),
          ]);
          send({
            type: "snapshot",
            serverNow: snap.serverNow,
            olympiad: snap.olympiad,
            participants: snap.participants,
            pagination: snap.pagination,
            pulse: { active, suspicious, violations24h },
          });
        } catch {
          send({ type: "error", code: "db" });
        }
      };

      await tick();
      iv = setInterval(() => void tick(), TICK_MS);
      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export const GET = wrapRouteHandlerWithSentry(getImpl, {
  method: "GET",
  parameterizedRoute: "/api/olympiad/monitor/[olympiadId]/stream",
});
