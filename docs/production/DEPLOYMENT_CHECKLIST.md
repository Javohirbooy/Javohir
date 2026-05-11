# Deployment checklist (Vercel + Next.js)

Use before every production promotion and after incident recovery.

## Environment

- [ ] **`DATABASE_URL`** (pooled) and **`DIRECT_URL`** (direct) set in Vercel; `sslmode=require` for Neon.
- [ ] **`AUTH_SECRET`** ≥ 32 chars, unique per environment, rotated after leaks.
- [ ] **`NEXT_PUBLIC_SITE_URL`** = canonical **HTTPS** origin (e.g. `https://www.example.com`).
- [ ] **`AUTH_URL`** or **`NEXTAUTH_URL`** = same public HTTPS origin Auth.js should use for callbacks.
- [ ] **`NEXT_PUBLIC_*`** reviewed: no private keys, tokens, or internal-only URLs that must stay secret.
- [ ] **Upstash** `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` on Vercel (recommended for production).
- [ ] **Resend** (or mail) keys only in server env.
- [ ] **`BLOB_READ_WRITE_TOKEN`** only server-side for uploads (if Blob used).
- [ ] **Sentry:** `NEXT_PUBLIC_SENTRY_DSN` (browser); `SENTRY_DSN` optional for server-only; `SENTRY_AUTH_TOKEN` **build-only** for source maps.
- [ ] **`ENABLE_HSTS=1`** only after confirming **no** HTTP-only assets or subdomains that would break.

## Build & release

- [ ] `npm run lint` and `npm run typecheck` green on the release commit.
- [ ] `npm run build` green with production-like env (or CI).
- [ ] Preview deployment smoke-tested (login, critical paths).
- [ ] Database: `prisma migrate deploy` (or your migration pipeline) applied **before** or in lockstep with app rollout.

## Post-deploy

- [ ] **`GET /api/health`** returns `200` with `"status":"ok"` and `"database":true`.
- [ ] Auth: sign-in, sign-out, session on HTTPS.
- [ ] Sentry: test error appears in correct **environment** / **release**.
- [ ] Rate limit smoke (optional): repeated failed login behaves as expected.

## Rollback

- [ ] Vercel: previous deployment ready to **Instant Rollback**.
- [ ] DB: know whether the release included **backward-compatible** migrations; if not, restore DB from backup per [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md).
