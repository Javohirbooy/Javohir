# Prisma + Neon connection notes

## Singleton

`@/lib/prisma` exports one **`PrismaClient`** per Node process (`globalThis.__IQ_MONITORING_PRISMA__`). Vercel serverless va `next build` workerlarida **har bir child process o‘z nusxasini** ochadi — bu normal.

## Build-time pool pressure

`next build` paytida bir nechta export workerlari parallel Prisma so‘rovlari yuborishi mumkin. Kamaytirish choralari:

1. **`next.config.ts`** — `experimental.staticGenerationMaxConcurrency` (default **4**), `staticGenerationMinPagesPerWorker` (default **32**), `staticGenerationRetryCount: 2`.
2. **Muhit** — `NEXT_STATIC_GEN_MAX_CONCURRENCY`, `NEXT_STATIC_GEN_MIN_PAGES_PER_WORKER` (CI yoki kuchsiz DB uchun).
3. **`NEXT_PHASE=phase-production-build`** paytida `getTunedDatabaseUrl` URLga **`connection_limit=5`** va **`pool_timeout=40`** qo‘shadi (allaqachon `connection_limit` bo‘lsa qayta yozilmaydi).
4. **`PRISMA_CONNECTION_LIMIT` / `PRISMA_POOL_TIMEOUT`** — build va runtime uchun aniq raqamlar (ustun).

## Neon / Vercel runtime

- Pooled `DATABASE_URL` da `pgbouncer=true` va `sslmode=require` saqlang.
- Serverless uchun Neon + Prisma tavsiyasi: connection stringda **`connection_limit=1`** (yoki juda kichik) — yuqori parallel so‘rovlar bo‘lsa `PRISMA_CONNECTION_LIMIT` bilan sinab toping.

## Edge

`PrismaClient` faqat **Node** runtime da ishlatiladi; `runtime = "edge"` marshrutlar `@/lib/prisma` import qilmasligi kerak.

## Memory

Og‘ir `include` o‘rniga **`select`** bilan kerakli ustunlarni cheklash (masalan, ochiq `/reyting`) — SSG vaqtida xotira bosimini kamaytiradi.
