import * as Sentry from "@sentry/nextjs";
import { getSharedSentryInitOptions } from "@/lib/sentry/init-core";

const base = getSharedSentryInitOptions("server");

Sentry.init({
  ...base,
  debug: process.env.SENTRY_DEBUG === "1",
});
