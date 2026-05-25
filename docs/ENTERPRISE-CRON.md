# Enterprise cron & worker architecture

## Layer model

```
Schedulers (Vercel / GitHub / QStash)
    → API routes (Node, CRON_SECRET)
        → Idempotency (Redis SET NX, 1h)
        → Distributed lock (Redis → Postgres advisory fallback)
        → Watchdog (stale locks, DLQ replay)
        → Load shed (DB latency / last failure)
        → Dynamic batch finalize
        → Per-session DB lease + idempotent OlympiadResult
```

## Redis schema

See `src/lib/cron/redis-keys.ts`.

## Queue migration (QStash)

1. Set `QSTASH_TOKEN`, `NEXT_PUBLIC_SITE_URL`
2. Enable publisher in `src/lib/queue/publisher.ts`
3. Cron enqueues `finalize_session` instead of inline batch (gradual)
4. Consumer: `POST /api/internal/worker/finalize-session`

### BullMQ alternative (self-hosted)

- Redis + dedicated worker VM (not Vercel serverless)
- Bull queue `olympiad:finalize` with concurrency 5
- Same `finalizeSessionWithDedicatedTransaction` handler

## Indexes (Postgres / Neon)

- `OlympiadSession(status, serverEndsAt)` — overdue scan
- `OlympiadSession(status, lastSeenAt)` — stale SUBMITTING
- `OlympiadSession(status, processingStartedAt) WHERE processingLock IS NOT NULL` — watchdog

## Connection pooling

- Vercel → Neon **pooled** `DATABASE_URL` (`pgbouncer=true`, `connection_limit=1`)
- Migrations → `DIRECT_URL`
- Avoid long transactions > 25s (Prisma timeout already 25s per session tx)

## Observability

| Signal | Where |
|--------|--------|
| `cron.job.start/finish` | Vercel logs |
| `cron.lock.skipped` | Lock contention |
| `cron.watchdog.complete` | Self-healing |
| `olympiad.finalize.run_complete` | Throughput |
| `queue.dlq.push` | Failures |
| Sentry | `component=cron`, `worker=finalize-session` |
| Health | `/api/health` → `workers.cronJobs`, heartbeats |

## Incident response

1. Check `/api/health?ui=1` — DB, Redis, cron jobs
2. `GET /api/cron/watchdog` with Bearer `CRON_SECRET` — manual heal
3. DLQ depth — Redis `LLEN iq:queue:dlq:finalize`
4. Stuck lock — auto TTL 100s; watchdog clears no-TTL keys
5. Exam day — scale Neon compute; reduce `batch` via env if needed

## Zero-downtime deploy

- Finalize is idempotent (`OlympiadResult` unique on `sessionId`)
- `stoppedEarly` + next cron continues
- Deploy does not clear Redis locks (TTL-bound)
- Watchdog clears stale `processingLock` after 4 min

## Cost controls

- keep-alive: `lite` (no Redis PING)
- Idempotency + lock skip → fewer DB rounds
- Dynamic batch reduces work near timeout

## Estimated limits (single Neon + Vercel Pro)

| Resource | Rough limit |
|----------|-------------|
| Concurrent cron invocations | 1 effective (lock) |
| Session finalize throughput | ~30–80/min (depends on question count) |
| DB connections | Pool 1–5 per lambda |
| Redis commands/cron | ~5–15 per tick |

**What breaks first:** Neon CPU/connection saturation under many concurrent **students**, not cron itself.

## Production score target

See release checklist in README section 10 of audit doc (maintained with code).
