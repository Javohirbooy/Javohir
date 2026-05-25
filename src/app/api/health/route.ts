import { wrapRouteHandlerWithSentry } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { isUpstashConfigured } from "@/lib/upstash-redis";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isStrictDistributedRateLimitPolicy, mustEnforceDistributedRedisAtStartup } from "@/lib/redis-strict-policy";
import { readOlympiadFinalizeHeartbeat } from "@/lib/worker/olympiad-cron-heartbeat";
import { readUptimeHeartbeat } from "@/lib/worker/uptime-heartbeat";
import { readCronRunStatuses } from "@/lib/worker/cron-run-status";
import { deadLetterDepth } from "@/lib/queue/dead-letter";

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
  workers?: {
    olympiadFinalizeLast: unknown | null;
    uptimeKeepAliveLast: unknown | null;
    cronJobs?: Partial<Record<string, unknown>>;
  };
  cron?: { secretConfigured: boolean; dlqDepth?: number };
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatWorkerLine(w: unknown): string {
  if (w == null) return "Hozircha yozuv yo‘q (cron ishlamagan bo‘lishi mumkin).";
  if (typeof w === "object" && w !== null && "at" in w) {
    const at = (w as { at?: unknown }).at;
    if (typeof at === "string") return escapeHtml(at);
  }
  return escapeHtml(JSON.stringify(w));
}

/** Brauzer uchun — `?ui=1`. JSON API: `/api/health` */
function healthHtmlPage(body: HealthBody, httpStatus: number): string {
  const json = escapeHtml(JSON.stringify(body, null, 2));
  const ok = body.status === "ok";
  const pillBg = ok ? "#16a34a" : "#ea580c";
  const redisPingV =
    body.redis?.checked === true ? (body.redis.ok ? "Muvaffaqiyatli" : "Xato") : "Tekshirilmagan";

  const deployId = body.deployment?.id ? escapeHtml(body.deployment.id) : "—";
  const deployEnv = escapeHtml(body.deployment?.env ?? "—");

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <title>Tizim holati — IQ Monitoring</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;background:linear-gradient(165deg,#ecfdf5 0%,#f8fafc 40%,#f1f5f9 100%);color:#0f172a;line-height:1.5;padding:24px 16px 48px}
    .mx{max-width:28rem;margin:0 auto}
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 4px 24px -4px rgba(15,23,42,.08);overflow:hidden}
    .hd{padding:20px 20px 16px;border-bottom:1px solid #f1f5f9}
    .pill{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:${pillBg};color:#fff;font-size:12px;font-weight:700;letter-spacing:.02em}
    .pill code{font-size:11px;opacity:.92;font-weight:600}
    h1{margin:12px 0 0;font-size:1.35rem;font-weight:800;letter-spacing:-.02em;color:#0f172a}
    .lead{margin:8px 0 0;font-size:14px;color:#64748b}
    .bd{padding:4px 0 8px}
    .row{display:flex;justify-content:space-between;gap:12px;padding:12px 20px;border-top:1px solid #f1f5f9;font-size:14px}
    .row:first-of-type{border-top:none}
    .k{color:#64748b;flex-shrink:0}
    .v{font-weight:600;color:#0f172a;text-align:right;word-break:break-word}
    .act{padding:16px 20px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;flex-direction:column;gap:10px}
    .btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 20px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;border:none;cursor:pointer}
    .btn-p{background:linear-gradient(135deg,#16a34a,#059669);color:#fff;box-shadow:0 2px 12px rgba(22,163,74,.35)}
    .btn-p:hover{filter:brightness(1.05)}
    .btn-s{background:#fff;color:#0f172a;border:1px solid #cbd5e1;font-weight:600;font-size:14px;min-height:44px}
    .btn-s:hover{background:#f1f5f9}
    details{margin:0 20px 16px;border:1px solid #e2e8f0;border-radius:12px;background:#fff}
    summary{list-style:none;cursor:pointer;padding:12px 14px;font-size:13px;font-weight:600;color:#047857;display:flex;align-items:center;gap:8px}
    summary::-webkit-details-marker{display:none}
    summary::before{content:"▸";font-size:10px;transition:transform .15s}
    details[open] summary::before{transform:rotate(90deg)}
    pre{margin:0;padding:14px 16px 16px;border-top:1px solid #f1f5f9;background:#f8fafc;font-size:11px;line-height:1.45;overflow:auto;color:#334155;max-height:min(50vh,320px)}
    .hint{font-size:12px;color:#94a3b8;text-align:center;padding:0 8px 16px}
  </style>
</head>
<body>
  <div class="mx card">
    <div class="hd">
      <div class="pill"><span>HTTP ${httpStatus}</span> <code>${escapeHtml(body.status)}</code></div>
      <h1>Tizim holati</h1>
      <p class="lead">Xavfsizlik: maxfiy kalitlar va ulanish qatorlari chiqmaydi. Faqat holat belgilari.</p>
    </div>
    <div class="bd">
      <div class="row"><span class="k">Holat</span><span class="v">${escapeHtml(body.status)}</span></div>
      <div class="row"><span class="k">Ma&apos;lumotlar bazasi</span><span class="v">${body.database ? "Ulangan" : "Yo'q / xato"}</span></div>
      <div class="row"><span class="k">Upstash Redis</span><span class="v">${escapeHtml(body.integrations?.upstash ?? "—")}</span></div>
      <div class="row"><span class="k">Redis PING</span><span class="v">${redisPingV}</span></div>
      <div class="row"><span class="k">AUTH_SECRET</span><span class="v">${body.secrets?.authSecretReady ? "Tayyor (≥32)" : "Yetarli emas"}</span></div>
      <div class="row"><span class="k">Rate limit</span><span class="v">${escapeHtml(body.rateLimit?.mode ?? "—")}</span></div>
      <div class="row"><span class="k">Redis startda majburiy</span><span class="v">${body.rateLimit?.redisRequiredAtStartup ? "Ha" : "Yo'q"}</span></div>
      <div class="row"><span class="k">Muhit</span><span class="v">${deployEnv}</span></div>
      <div class="row"><span class="k">Deploy ID</span><span class="v">${deployId}</span></div>
      <div class="row"><span class="k">Uptime ping (oxirgi)</span><span class="v">${formatWorkerLine(body.workers?.uptimeKeepAliveLast ?? null)}</span></div>
      <div class="row"><span class="k">Olimpiada cron (oxirgi)</span><span class="v">${formatWorkerLine(body.workers?.olympiadFinalizeLast ?? null)}</span></div>
    </div>
    <details>
      <summary>To‘liq JSON (dasturchilar uchun)</summary>
      <pre>${json}</pre>
    </details>
    <p class="hint">Monitoring skriptlari uchun: <strong>/api/health</strong> (JSON, <code>Accept</code> bilan).</p>
    <div class="act">
      <a class="btn btn-p" href="/">Bosh sahifaga qaytish</a>
      <a class="btn btn-s" href="/api/health" target="_blank" rel="noopener noreferrer">JSON ni yangi varaqda ochish</a>
    </div>
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
    workers: {
      olympiadFinalizeLast: await readOlympiadFinalizeHeartbeat(),
      uptimeKeepAliveLast: await readUptimeHeartbeat(),
      cronJobs: await readCronRunStatuses(),
    },
    cron: {
      secretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
      dlqDepth: await deadLetterDepth(),
    },
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
