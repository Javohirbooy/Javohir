import { isAuthorizedCron } from "@/lib/cron/authorize";
import { CRON_LOCK, CRON_LOCK_TTL_SEC } from "@/lib/cron/cron-config";
import { runFinalizeCronJob } from "@/lib/cron/jobs/run-finalize-cron";
import { parsePositiveInt } from "@/lib/cron/parse-query-int";
import { executeCronJob } from "@/lib/cron/run-handler";
import { runKeepAliveCheck } from "@/lib/cron/run-keep-alive-check";
import { recordUptimeHeartbeat } from "@/lib/worker/uptime-heartbeat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const skipFinalize = url.searchParams.get("finalize") === "0";
  const batchLimit = parsePositiveInt(url.searchParams.get("batch"), 30, 200);
  const maxRounds = parsePositiveInt(url.searchParams.get("rounds"), 15, 100);

  return executeCronJob({
    req,
    job: "tick",
    lockKey: CRON_LOCK.olympiadFinalize,
    lockTtlSec: CRON_LOCK_TTL_SEC.olympiadFinalize,
    handler: async () => {
      const keepAlive = await runKeepAliveCheck("full");
      const at = new Date().toISOString();
      await recordUptimeHeartbeat({
        at,
        ok: keepAlive.database,
        database: keepAlive.database,
        redis: keepAlive.redis,
        durationMs: keepAlive.durationMs,
      });

      const finalize = skipFinalize
        ? null
        : await runFinalizeCronJob({ mode: "tick", baseBatch: batchLimit, baseRounds: maxRounds });

      return { keepAlive, finalize };
    },
    onSuccess: async (payload) =>
      payload.finalize?.stats
        ? {
            runId: payload.finalize.stats.runId,
            finalized: payload.finalize.stats.finalized,
            errors: payload.finalize.stats.errors,
          }
        : {},
    onFailure: async () => {
      await recordUptimeHeartbeat({ at: new Date().toISOString(), ok: false });
    },
  });
}

export async function POST(req: Request) {
  return GET(req);
}
