# Production readiness report

**Stack:** Next.js 16 (App Router), Vercel, Neon PostgreSQL, Auth.js v5, Sentry, optional Upstash Redis / Vercel Blob.

This document summarizes hardening work, **severity-ranked findings**, and **residual risks**. Use it with [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md), [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md), and [BACKUP_AND_RESTORE.md](./BACKUP_AND_RESTORE.md).

---

## Executive summary

The application is suitable for public deployment when:

1. **Secrets** live only in server env / Vercel project settings; `NEXT_PUBLIC_*` contains no secrets.
2. **`NEXT_PUBLIC_SITE_URL`** and **`AUTH_URL` / `NEXTAUTH_URL`** use **HTTPS** in production (or Vercel provides `VERCEL_URL` for canonical URL fallback).
3. **`AUTH_SECRET`** is at least 32 characters; **`DATABASE_URL`** is set.
4. **Upstash** is configured on Vercel for consistent **rate limiting / lockout** across instances.
5. **`ENABLE_HSTS=1`** is enabled only after the site is **HTTPS-only** end-to-end (avoid lockout).
6. **Neon** (or your host) has **automated backups**; **Blob** assets have an export/retention policy.

---

## Severity-ranked issues

| Severity | Topic | Status | Notes |
|----------|--------|--------|--------|
| **Critical** | Secrets in client bundles | **Mitigated** | Zod `publicEnvSchema` only allows safe `NEXT_PUBLIC_*` keys; never put API keys in `NEXT_PUBLIC_`. |
| **Critical** | Missing `DATABASE_URL` / weak `AUTH_SECRET` in production | **Fixed** | `assertProductionConfig()` throws; upload tokens require strong `AUTH_SECRET` in production. |
| **Critical** | Weak upload signing in production | **Fixed** | `upload-signature.ts` throws if `AUTH_SECRET` missing/short in production. |
| **High** | HTTP canonical / session URL in production | **Mitigated** | HTTPS enforced on `NEXT_PUBLIC_SITE_URL` and auth base URL unless `ALLOW_INSECURE_SITE_URL`, `SKIP_PRODUCTION_HTTPS_ENFORCEMENT`, `GITHUB_ACTIONS`, or Vercel-only URL fallback. |
| **High** | Invalid env shapes silently passing | **Fixed** | Public + server Zod schemas; production startup **throws** on schema failure. |
| **High** | Secrets in structured logs | **Mitigated** | `sanitizeLogFields()` masks sensitive keys in `logStructured`. |
| **High** | Secrets in Sentry request URLs | **Mitigated** | `before-send` strips common query params (`password`, `token`, `code`, …). |
| **Medium** | Multi-instance rate limits | **Residual** | Documented: without Upstash, limits are best-effort per instance. |
| **Medium** | Build-time / SSG DB pool pressure | **Residual** | Prisma pool timeouts can appear under parallel static generation; tune pool or reduce build-time DB work. |
| **Medium** | HSTS preload | **Residual** | `ENABLE_HSTS=1` uses long `max-age` + `preload`; enable only when HTTPS is permanent. |
| **Low** | No first-party middleware CSP | **Residual** | Security headers in `next.config.ts`; add stricter CSP when inline scripts/styles are fully audited. |
| **Low** | CSRF for cookie sessions | **Residual** | NextAuth + same-site cookies; document custom forms that bypass framework CSRF. |

---

## Auto-fixed in code (high level)

- **`src/lib/env-schema.ts`** — Zod validation for public vs server-shaped env.
- **`src/lib/env.ts`** — `getSiteUrl()`, `validateServerEnv()`, `assertProductionConfig()` with HTTPS and Vercel-aware rules.
- **`src/lib/logger.ts`** — log field sanitization.
- **`src/lib/upload-signature.ts`** — production requires strong `AUTH_SECRET`.
- **`src/app/api/health/route.ts`** — liveness (`SELECT 1`); optional Redis ping via `HEALTH_CHECK_REDIS=1`.
- **`src/lib/sentry/before-send.ts`** — URL query scrubbing.
- **`playwright.config.ts`** — `ALLOW_INSECURE_SITE_URL=1` for `next start` E2E over HTTP.
- **`src/lib/env.ts`** — corrected Zod error handling (`pub.errors` / `sec.errors`).
- **`Dockerfile`** — builder-stage `AUTH_SECRET` placeholder + `SKIP_PRODUCTION_HTTPS_ENFORCEMENT=1` so `next build` passes without real public URLs (runtime image still requires real env via `check-env.mjs`).

---

## Deployment checklist (short)

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md).

---

## Disaster recovery checklist (short)

See [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md).

---

## Security hardening summary (short)

- **Transport:** Enforce HTTPS URLs in production config; enable HSTS only when ready (`ENABLE_HSTS=1` in `next.config.ts`).
- **Headers:** `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `COOP`, `Permissions-Policy` (see `next.config.ts`).
- **Sessions:** Auth base URL must be HTTPS in production; Auth.js derives cookie behavior from the deployment URL (do not force `useSecureCookies` in a way that breaks local HTTP E2E).
- **Observability:** Sentry with `sendDefaultPii: false`, header/cookie stripping, URL param scrubbing; optional `VERCEL_DEPLOYMENT_ID` on `/api/health` for correlation.
- **CI:** `GITHUB_ACTIONS=true` relaxes HTTP for localhost test URLs; source maps use `deleteSourcemapsAfterUpload: true`.

---

## Remaining actions (operators)

1. Turn on **Neon** (or provider) **PITR / scheduled backups**.
2. Configure **Vercel Blob** lifecycle / second account for DR if needed.
3. Add **external uptime** checks (e.g. `/api/health` from two regions).
4. Set **`SENTRY_AUTH_TOKEN`** only in CI / Vercel build env, not in runtime client.
