import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { getUpstashRedis } from "@/lib/upstash-redis";

export type KeepAliveDepth = "lite" | "full";

export type KeepAliveCheckResult = {
  database: boolean;
  redis: boolean;
  redisSkipped: boolean;
  durationMs: number;
};

/**
 * Serverless uxlashini kamaytirish.
 * `lite` — faqat DB (har 5 daqiqada yetarli); `full` — DB + Redis PING (kamroq chaqiring).
 */
export async function runKeepAliveCheck(depth: KeepAliveDepth = "lite"): Promise<KeepAliveCheckResult> {
  const started = Date.now();
  let database = false;
  let redis = false;

  if (isDatabaseConfigured()) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = true;
    } catch {
      database = false;
    }
  }

  const redisSkipped = depth === "lite";
  if (!redisSkipped) {
    const client = getUpstashRedis();
    if (client) {
      try {
        await client.ping();
        redis = true;
      } catch {
        redis = false;
      }
    }
  }

  return {
    database,
    redis,
    redisSkipped,
    durationMs: Date.now() - started,
  };
}
