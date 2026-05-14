import { auth } from "@/auth";
import { wrapRouteHandlerWithSentry } from "@sentry/nextjs";
import { assertOlympiadMonitorAccess } from "@/lib/olympiad/authz";
import {
  isOlympiadMonitorDbSnapshotSparseEnabled,
  isOlympiadMonitorRedisEventsEnabled,
  isOlympiadMonitorSseEnabled,
} from "@/lib/olympiad/feature-flags";
import { getOlympiadMonitorSnapshot } from "@/lib/olympiad/monitor-snapshot";
import { readOlympiadMonitorRedisBundle } from "@/lib/olympiad/olympiad-redis-events";
import { olympiadIdParamSchema } from "@/lib/olympiad/schemas";
import { OLYMPIAD_SUSPICIOUS_SCORE_ALERT_THRESHOLD } from "@/lib/olympiad/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SNAPSHOT_SESSIONS = 100;
const SNAPSHOT_VIOLATIONS = 6;
const TICK_MS = 8000;
const MAX_EVENTS_OUT = 48;

/**
 * SSE: to‘liq snapshot (kam-tezlikli) + yengil pulse (sonlar).
 * `OLYMPIAD_MONITOR_SSE=1` bo‘lmaganda 404.
 */
async function getImpl(req: Request, ctx: { params: Promise<{ olympiadId: string }> }) {
  if (!isOlympiadMonitorSseEnabled()) {
    return new Response(JSON.stringify({ error: "sse_disabled" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }
  const session = await auth();
  const rawParams = await ctx.params;
  const idParsed = olympiadIdParamSchema.safeParse(rawParams.olympiadId);
  if (!idParsed.success) {
    return new Response(JSON.stringify({ error: "invalid_params" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const olympiadId = idParsed.data;
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
      /** WHY: Prevents overlapping async ticks when a snapshot exceeds `TICK_MS` (no dogpile on Prisma/Redis). */
      let tickInFlight = false;
      /** WHY: Exponential moving average for server-side tick latency observability (cheap, no external APM required). */
      let emaTickMs = 0;
      let emaSnapMs = 0;
      const alpha = 0.25;
      let redisDownStreak = 0;

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
        if (tickInFlight) return;
        const tickStarted = performance.now();
        tickInFlight = true;
        let snapshotLatencyMs = 0;
        let redisUnavailable = false;
        try {
          tickCount += 1;
          const sparse = isOlympiadMonitorDbSnapshotSparseEnabled();
          const redisEv = isOlympiadMonitorRedisEventsEnabled();
          const fullSnap = !sparse || !redisEv || tickCount === 1 || tickCount % 5 === 0;

          if (redisEv) {
            const bundle = await readOlympiadMonitorRedisBundle(olympiadId, MAX_EVENTS_OUT);
            redisUnavailable = bundle.redisUnavailable;
            if (redisUnavailable) redisDownStreak += 1;
            else redisDownStreak = 0;

            // WHY: Bounded payload — very chatty exams cannot OOM the monitor tab via giant JSON frames.
            const events = bundle.events.slice(0, MAX_EVENTS_OUT);
            const droppedEvents = Math.max(0, bundle.events.length - events.length);

            send({
              type: "events",
              serverNow: new Date().toISOString(),
              events,
              readModel: bundle.readModel,
              degraded: redisUnavailable || redisDownStreak >= 2,
              droppedEvents,
            });
          }

          // WHY: Some proxies close idle streams; lightweight heartbeats keep the connection warm without full DB snapshots.
          send({ type: "heartbeat", serverNow: new Date().toISOString(), tick: tickCount });

          if (!fullSnap) {
            const tickMs = performance.now() - tickStarted;
            emaTickMs = emaTickMs === 0 ? tickMs : alpha * tickMs + (1 - alpha) * emaTickMs;
            send({
              type: "metrics",
              serverNow: new Date().toISOString(),
              tickDurationMs: Math.round(tickMs),
              avgTickDurationMs: Math.round(emaTickMs),
              snapshotLatencyMs: 0,
              avgSnapshotLatencyMs: Math.round(emaSnapMs),
              redisUnavailable,
              droppedEvents: 0,
              tick: tickCount,
            });
            return;
          }

          try {
            const snapT0 = performance.now();
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
            snapshotLatencyMs = performance.now() - snapT0;
            emaSnapMs = emaSnapMs === 0 ? snapshotLatencyMs : alpha * snapshotLatencyMs + (1 - alpha) * emaSnapMs;

            send({
              type: "snapshot",
              serverNow: snap.serverNow,
              olympiad: snap.olympiad,
              participants: snap.participants,
              pagination: snap.pagination,
              pulse: { active, suspicious, violations24h },
              degraded: redisUnavailable || redisDownStreak >= 2,
            });
          } catch {
            send({ type: "error", code: "db" });
          }

          const tickMs = performance.now() - tickStarted;
          emaTickMs = emaTickMs === 0 ? tickMs : alpha * tickMs + (1 - alpha) * emaTickMs;
          send({
            type: "metrics",
            serverNow: new Date().toISOString(),
            tickDurationMs: Math.round(tickMs),
            avgTickDurationMs: Math.round(emaTickMs),
            snapshotLatencyMs: Math.round(snapshotLatencyMs),
            avgSnapshotLatencyMs: Math.round(emaSnapMs),
            redisUnavailable,
            droppedEvents: 0,
            tick: tickCount,
          });
        } finally {
          tickInFlight = false;
        }
      };

      await tick();
      iv = setInterval(() => void tick(), TICK_MS);
      req.signal.addEventListener("abort", close, { once: true });
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
