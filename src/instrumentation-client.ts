import * as Sentry from "@sentry/nextjs";
import { getSharedSentryInitOptions } from "@/lib/sentry/init-core";

const isProd = process.env.NODE_ENV === "production";

Sentry.init({
  ...getSharedSentryInitOptions("browser"),
  debug: process.env.SENTRY_DEBUG === "1",
  tracePropagationTargets: isProd
    ? ["localhost", /^https:\/\/.+\.vercel\.app$/]
    : ["localhost", /^http:\/\/127\.0\.0\.1(:\d+)?$/, /^http:\/\/localhost(:\d+)?$/],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
