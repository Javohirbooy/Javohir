import { wrapRouteHandlerWithSentry } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { isUpstashConfigured } from "@/lib/upstash-redis";
import { prisma } from "@/lib/prisma";

type HealthBody = {
  status: "ok" | "degraded";
  database: boolean;
  redis?: { ok: boolean; checked: boolean };
  /** Hech qanday maxfiy token yo‘q — faqat mavjudlik */
  integrations?: { upstash: "on" | "off" };
  deployment?: { id?: string; env?: string };
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

  const body: HealthBody = {
    status: database ? "ok" : "degraded",
    database,
    integrations: { upstash: isUpstashConfigured() ? "on" : "off" },
    deployment: {
      id: process.env.VERCEL_DEPLOYMENT_ID,
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    },
  };

  if (process.env.HEALTH_CHECK_REDIS === "1" && isUpstashConfigured()) {
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
