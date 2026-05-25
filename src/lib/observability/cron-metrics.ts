import * as Sentry from "@sentry/nextjs";
import { logStructured, type LogFields } from "@/lib/logger";
import type { CronJobName } from "@/lib/cron/cron-config";

export function traceCronSpan(job: CronJobName, fields: LogFields): void {
  logStructured("info", `cron.metrics.${job}`, fields);
  Sentry.addBreadcrumb({
    category: "cron",
    message: job,
    level: "info",
    data: fields as Record<string, unknown>,
  });
}

export function captureCronFailure(job: CronJobName, error: unknown, extra?: LogFields): void {
  Sentry.captureException(error, {
    tags: { component: "cron", job },
    extra: extra as Record<string, unknown> | undefined,
  });
  logStructured("error", "cron.metrics.failure", {
    job,
    message: error instanceof Error ? error.message : String(error),
    ...extra,
  });
}
