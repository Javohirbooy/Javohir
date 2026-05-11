import * as Sentry from "@sentry/nextjs";
import { getSharedSentryInitOptions } from "@/lib/sentry/init-core";

Sentry.init({
  ...getSharedSentryInitOptions("edge"),
  debug: process.env.SENTRY_DEBUG === "1",
});
