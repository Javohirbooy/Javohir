import { isAuthorizedCron } from "@/lib/cron/authorize";
import { CRON_LOCK, CRON_LOCK_TTL_SEC } from "@/lib/cron/cron-config";
import { executeCronJob } from "@/lib/cron/run-handler";
import { runKeepAliveCheck, type KeepAliveDepth } from "@/lib/cron/run-keep-alive-check";
import { recordUptimeHeartbeat } from "@/lib/worker/uptime-heartbeat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const depth: KeepAliveDepth = url.searchParams.get("deep") === "1" ? "full" : "lite";

  return executeCronJob({
    req,
    job: "keep-alive",
    lockKey: CRON_LOCK.uptimePing,
    lockTtlSec: CRON_LOCK_TTL_SEC.uptimePing,
    handler: async () => {
      const check = await runKeepAliveCheck(depth);
      const at = new Date().toISOString();
      await recordUptimeHeartbeat({
        at,
        ok: check.database,
        database: check.database,
        redis: check.redisSkipped ? undefined : check.redis,
        durationMs: check.durationMs,
      });
      return { ...check, at, ok: check.database };
    },
    onFailure: async () => {
      await recordUptimeHeartbeat({ at: new Date().toISOString(), ok: false });
    },
  });
}

export async function POST(req: Request) {
  return GET(req);
}
