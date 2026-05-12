import { wrapRouteHandlerWithSentry } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { isUpstashConfigured } from "@/lib/upstash-redis";
import { prisma } from "@/lib/prisma";
import { isStrictDistributedRateLimitPolicy, mustEnforceDistributedRedisAtStartup } from "@/lib/redis-strict-policy";
import { readOlympiadFinalizeHeartbeat } from "@/lib/worker/olympiad-cron-heartbeat";

type HealthBody = {
  status: "ok" | "degraded";
  database: boolean;
  redis?: { ok: boolean; checked: boolean };
  /** Hech qanday maxfiy token yo‘q — faqat mavjudlik */
  integrations?: { upstash: "on" | "off" };
  deployment?: { id?: string; env?: string };
  rateLimit?: {
    mode: "strict_distributed" | "best_effort";
    redisRequiredAtStartup: boolean;
  };
  workers?: { olympiadFinalizeLast: unknown | null };
};

/**
 * Liveness / readiness. `HEALTH_CHECK_REDIS=1` bo‘lsa Upstash PING (bir necha ms).
 */
async function getImpl(): Promise<NextResponse<HealthBody>> {
  let database = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }

  const strictRl = isStrictDistributedRateLimitPolicy();
  const redisStartupRequired = mustEnforceDistributedRedisAtStartup();
  const upstashOn = isUpstashConfigured();

  const body: HealthBody = {
    status: database ? "ok" : "degraded",
    database,
    integrations: { upstash: upstashOn ? "on" : "off" },
    deployment: {
      id: process.env.VERCEL_DEPLOYMENT_ID,
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    },
    rateLimit: {
      mode: strictRl ? "strict_distributed" : "best_effort",
      redisRequiredAtStartup: redisStartupRequired,
    },
    workers: { olympiadFinalizeLast: await readOlympiadFinalizeHeartbeat() },
  };

  if ((strictRl || redisStartupRequired) && !upstashOn) {
    body.status = "degraded";
  }

  if (process.env.HEALTH_CHECK_REDIS === "1" && upstashOn) {
    try {
      const { Redis } = await import("@upstash/redis");
      const url = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;
      if (url && token) {
        const r = new Redis({ url, token });
        body.redis = { ok: (await r.ping()) === "PONG", checked: true };
        if (!body.redis.ok) body.status = "degraded";
      }
    } catch {
      body.redis = { ok: false, checked: true };
      body.status = "degraded";
    }
  }

  const statusCode = body.status === "ok" ? 200 : 503;
  return NextResponse.json(body, { status: statusCode });
}

export const GET = wrapRouteHandlerWithSentry(getImpl, {
  method: "GET",
  parameterizedRoute: "/api/health",
});
