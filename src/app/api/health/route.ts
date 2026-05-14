import { wrapRouteHandlerWithSentry } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { isUpstashConfigured } from "@/lib/upstash-redis";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isStrictDistributedRateLimitPolicy, mustEnforceDistributedRedisAtStartup } from "@/lib/redis-strict-policy";
import { readOlympiadFinalizeHeartbeat } from "@/lib/worker/olympiad-cron-heartbeat";

type HealthBody = {
  status: "ok" | "degraded";
  database: boolean;
  redis?: { ok: boolean; checked: boolean };
  /** Hech qanday maxfiy token yo‘q — faqat mavjudlik */
  integrations?: { upstash: "on" | "off" };
  /** Maxfiy qiymatlar chiqmaydi — deploy tekshiruvi uchun */
  secrets?: {
    databaseConfigured: boolean;
    authSecretReady: boolean;
    upstashConfigured: boolean;
  };
  deployment?: { id?: string; env?: string };
  rateLimit?: {
    mode: "strict_distributed" | "best_effort";
    redisRequiredAtStartup: boolean;
  };
  workers?: { olympiadFinalizeLast: unknown | null };
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Brauzer uchun oddiy HTML — `?ui=1` (masalan “Holat” tugmasi). */
function healthHtmlPage(body: HealthBody, httpStatus: number): string {
  const json = escapeHtml(JSON.stringify(body, null, 2));
  const ok = body.status === "ok";
  const badge = ok ? "OK" : "503";
  const badgeBg = ok ? "#059669" : "#b45309";
  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Tizim holati — IQ Monitoring</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:24px;background:#0f172a;color:#e2e8f0;line-height:1.5}
    .wrap{max-width:42rem;margin:0 auto}
    h1{font-size:1.25rem;margin:0 0 8px}
    .sub{color:#94a3b8;font-size:.875rem;margin-bottom:20px}
    .pill{display:inline-block;padding:4px 10px;border-radius:999px;font-weight:700;font-size:.75rem;background:${badgeBg};color:#fff;margin-bottom:16px}
    dl{display:grid;gap:8px 16px;margin:16px 0;font-size:.875rem}
    dt{color:#94a3b8}
    dd{margin:0;font-weight:600}
    pre{background:#020617;border:1px solid #334155;border-radius:12px;padding:16px;overflow:auto;font-size:12px;color:#cbd5e1}
    a{color:#6ee7b7}
    .foot{margin-top:20px;font-size:.8rem;color:#64748b}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="pill">HTTP ${httpStatus} · ${badge}</div>
    <h1>Tizim holati</h1>
    <p class="sub">Bu sahifa faqat xizmat ko‘rsatish holatini ko‘rsatadi. Maxfiy kalitlar chiqmaydi.</p>
    <dl>
      <dt>Holat</dt><dd>${escapeHtml(body.status)}</dd>
      <dt>Ma’lumotlar bazasi</dt><dd>${body.database ? "ulanish bor" : "xato / yo‘q"}</dd>
      <dt>Upstash</dt><dd>${escapeHtml(body.integrations?.upstash ?? "—")}</dd>
      <dt>Auth secret (≥32)</dt><dd>${body.secrets?.authSecretReady ? "tayyor" : "yo‘q / qisqa"}</dd>
      <dt>Rate limit rejimi</dt><dd>${escapeHtml(body.rateLimit?.mode ?? "—")}</dd>
      <dt>Deploy</dt><dd>${escapeHtml(body.deployment?.env ?? "—")} ${body.deployment?.id ? `· <span style="word-break:break-all">${escapeHtml(body.deployment.id)}</span>` : ""}</dd>
    </dl>
    <p style="font-size:.875rem;color:#94a3b8;margin-top:20px">Texnik ma’lumot (ixtiyoriy):</p>
    <details style="margin-top:8px">
      <summary style="cursor:pointer;color:#6ee7b7;font-size:.875rem;font-weight:600">To‘liq JSON ni ko‘rsatish</summary>
      <pre style="margin-top:12px">${json}</pre>
    </details>
    <p class="foot">
      <a href="/api/health">/api/health</a> — monitoring va skriptlar uchun JSON.<br/>
      <a href="/">Bosh sahifa</a>
    </p>
  </div>
</body>
</html>`;
}

/**
 * Liveness / readiness. `HEALTH_CHECK_REDIS=1` bo‘lsa Upstash PING (bir necha ms).
 * Inson o‘qishi uchun: <code>/api/health?ui=1</code>
 */
async function getImpl(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const wantsUi = url.searchParams.get("ui") === "1";
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
  const authSecret = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();

  const body: HealthBody = {
    status: database ? "ok" : "degraded",
    database,
    integrations: { upstash: upstashOn ? "on" : "off" },
    secrets: {
      databaseConfigured: isDatabaseConfigured(),
      authSecretReady: Boolean(authSecret && authSecret.length >= 32),
      upstashConfigured: upstashOn,
    },
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

  if (wantsUi) {
    const html = healthHtmlPage(body, statusCode);
    return new NextResponse(html, {
      status: statusCode,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json(body, { status: statusCode });
}

export const GET = wrapRouteHandlerWithSentry(getImpl, {
  method: "GET",
  parameterizedRoute: "/api/health",
});
