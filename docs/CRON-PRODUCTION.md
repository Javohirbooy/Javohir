# Cron & uptime — production qo‘llanma

## Endpointlar

| Path | Jadval (Pro) | Lock | Vazifa |
|------|--------------|------|--------|
| `/api/cron/keep-alive` | GH Actions / `?deep=1` | `uptime_ping` | DB ping (`lite`) — Hobby Vercel da emas |
| `/api/cron/tick` | `0 6 * * *` (Hobby) | `olympiad_finalize` | ping + finalize + watchdog |
| `/api/cron/olympiad-finalize` | `0 3 * * *` | `olympiad_finalize` | katta partiya (budget 110s) |

## Env

- `CRON_SECRET` — productionda **majburiy** (≥32 belgi)
- `UPSTASH_REDIS_REST_*` — distributed lock + heartbeat
- `PRODUCTION_SITE_URL` — GitHub Actions secret

## Vercel Hobby

- `*/5` va `*/10` **ishlamasligi** mumkin — faqat `vercel.json` dagi kunlik cron + **GitHub Actions** `uptime.yml`.
- Hobby: maksimum **2** cron job, kuniga 1 marta dan tez emas.

## Monitoring

- JSON: `GET /api/health` → `workers.cronJobs`, `cron.secretConfigured`
- UI: `/api/health?ui=1`
- Sentry: `component=cron`, `job=...`
- Loglar: `cron.job.start`, `cron.lock.skipped`, `olympiad.finalize.run_complete`

## Tashqi ping (ixtiyoriy)

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  "https://YOUR_DOMAIN/api/cron/keep-alive"
```

`lock_held` + HTTP 200 — normal (parallel scheduler).
