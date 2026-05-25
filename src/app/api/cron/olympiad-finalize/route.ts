import { isAuthorizedCron } from "@/lib/cron/authorize";
import { CRON_LOCK, CRON_LOCK_TTL_SEC } from "@/lib/cron/cron-config";
import { runFinalizeCronJob } from "@/lib/cron/jobs/run-finalize-cron";
import { parsePositiveInt } from "@/lib/cron/parse-query-int";
import { executeCronJob } from "@/lib/cron/run-handler";
import { recordOlympiadFinalizeHeartbeat } from "@/lib/worker/olympiad-cron-heartbeat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const batchLimit = parsePositiveInt(url.searchParams.get("batch"), 50, 200);
  const maxRounds = parsePositiveInt(url.searchParams.get("rounds"), 25, 100);

  return executeCronJob({
    req,
    job: "olympiad-finalize",
    lockKey: CRON_LOCK.olympiadFinalize,
    lockTtlSec: CRON_LOCK_TTL_SEC.olympiadFinalize,
    handler: () => runFinalizeCronJob({ mode: "nightly", baseBatch: batchLimit, baseRounds: maxRounds }),
    onSuccess: async (result) =>
      result.stats
        ? { runId: result.stats.runId, finalized: result.stats.finalized, errors: result.stats.errors }
        : {},
    onFailure: async () => {
      await recordOlympiadFinalizeHeartbeat({
        at: new Date().toISOString(),
        ok: false,
        errors: 1,
      });
    },
  });
}

export async function POST(req: Request) {
  return GET(req);
}
