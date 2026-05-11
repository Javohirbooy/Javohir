# Observability and uptime

## In-app

- **Sentry** (server / edge / browser): errors, performance traces; `SENTRY_DEBUG` only temporarily.
- **`GET /api/health`**: JSON with `database`, optional `redis` when `HEALTH_CHECK_REDIS=1`, non-secret `deployment.id` / `deployment.env`.
- **Structured logs:** `logStructured` / `logStructuredFromRequest` — avoid putting raw bodies in `fields`; keys matching password/token patterns are **redacted**.

## External (recommended)

- **Synthetic checks:** ping `/api/health` from two providers/regions; alert on non-200 or `status !== "ok"`.
- **SSL expiry** and **DNS** monitoring on the apex and `www`.
- **Neon / Vercel** status pages wired to on-call.

## Silent failures

- Watch **5xx rate** and **latency** on `/api/auth/*` and critical server actions in Sentry Performance or APM.
- Compare **login success vs failure** counts (metrics or log-based) to detect credential stuffing.

## Source maps

- `next.config.ts`: `deleteSourcemapsAfterUpload: true` — maps in Sentry, not on public CDN.
- Keep **`SENTRY_AUTH_TOKEN`** out of browser and runtime-only env; CI / Vercel build only.
