/**
 * Prisma PostgreSQL URL query tuning (Neon pooler + serverless).
 * Parol/maxsus belgilarni buzmaslik uchun to‘liq `URL` parse qilinmaydi — faqat query qismi.
 */

const PHASE_PRODUCTION_BUILD = "phase-production-build";

function hasQueryKey(url: string, key: string): boolean {
  return new RegExp(`[?&]${key}=`, "i").test(url);
}

/** Neon / cloud Postgres: `sslmode=require` bo‘lmasa ba’zi muhitlarda ulanish xato yoki sekin. */
function ensureSslModeForRemote(url: string): string {
  if (/localhost|127\.0\.0\.1/i.test(url)) return url;
  if (hasQueryKey(url, "sslmode")) return url;
  return setOrReplaceQueryParam(url, "sslmode", "require");
}

function setOrReplaceQueryParam(url: string, key: string, value: string): string {
  const re = new RegExp(`([?&])${key}=[^&]*`, "i");
  if (re.test(url)) return url.replace(re, `$1${key}=${encodeURIComponent(value)}`);
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${key}=${encodeURIComponent(value)}`;
}

/**
 * `PrismaClient` uchun `datasources.db.url` — migrate `directUrl` ga tegmaydi.
 *
 * - **Build** (`NEXT_PHASE=phase-production-build`): `connection_limit` + `pool_timeout`
 *   (agar URLda bo‘lmasa) — parallel SSG workerlari bilan pool exhaustion kamayadi.
 * - **`PRISMA_CONNECTION_LIMIT` / `PRISMA_POOL_TIMEOUT`**: har doim ustun (raqam bo‘lsa).
 */
export function getTunedDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return raw;
  let url = raw.trim();

  const limitEnv = process.env.PRISMA_CONNECTION_LIMIT?.trim();
  if (limitEnv && /^\d+$/.test(limitEnv)) {
    url = setOrReplaceQueryParam(url, "connection_limit", limitEnv);
  } else if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD && !hasQueryKey(url, "connection_limit")) {
    url = setOrReplaceQueryParam(url, "connection_limit", "5");
  }

  const poolEnv = process.env.PRISMA_POOL_TIMEOUT?.trim();
  if (poolEnv && /^\d+$/.test(poolEnv)) {
    url = setOrReplaceQueryParam(url, "pool_timeout", poolEnv);
  } else if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD && !hasQueryKey(url, "pool_timeout")) {
    url = setOrReplaceQueryParam(url, "pool_timeout", "40");
  }

  return ensureSslModeForRemote(url);
}
