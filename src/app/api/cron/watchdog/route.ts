import { isAuthorizedCron } from "@/lib/cron/authorize";
import { CRON_LOCK, CRON_LOCK_TTL_SEC } from "@/lib/cron/cron-config";
import { executeCronJob } from "@/lib/cron/run-handler";
import { runCronWatchdog } from "@/lib/cron/watchdog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Self-healing: stale locks, DLQ replay, heartbeat staleness signal. */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  return executeCronJob({
    req,
    job: "watchdog",
    lockKey: CRON_LOCK.uptimePing,
    lockTtlSec: CRON_LOCK_TTL_SEC.uptimePing,
    handler: () => runCronWatchdog(),
  });
}

export async function POST(req: Request) {
  return GET(req);
}
