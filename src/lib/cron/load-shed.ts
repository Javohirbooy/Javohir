import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { logStructured } from "@/lib/logger";
import { readCronRunStatuses } from "@/lib/worker/cron-run-status";
import type { CronJobName } from "@/lib/cron/cron-config";

export type LoadShedDecision = {
  allowFinalize: boolean;
  reason?: string;
  dbLatencyMs?: number;
};

/**
 * WHY: DB sekinlashganda yoki ketma-ket cron xatolarda finalize to‘xtatiladi — platforma yiqilmasin.
 */
export async function evaluateLoadShed(job: CronJobName): Promise<LoadShedDecision> {
  const statuses = await readCronRunStatuses();
  const recent = statuses[job];
  if (recent && recent.ok === false) {
    return { allowFinalize: false, reason: "last_run_failed" };
  }

  if (!isDatabaseConfigured()) {
    return { allowFinalize: false, reason: "db_not_configured" };
  }

  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return { allowFinalize: false, reason: "db_ping_failed" };
  }
  const dbLatencyMs = Date.now() - t0;

  if (dbLatencyMs > 2_500) {
    logStructured("warn", "cron.load_shed.slow_db", { job, dbLatencyMs });
    return { allowFinalize: false, reason: "slow_db", dbLatencyMs };
  }

  return { allowFinalize: true, dbLatencyMs };
}
