/**
 * Bir IP dan ko‘p parallel kirish (maktab Wi‑Fi) simulyatsiyasi.
 * Middleware `mw_auth_post` va NextAuth yo‘lini yuklaydi — noto‘g‘ri body ham POST hisoblanadi.
 *
 * Ishlatish (server ishlab turishi kerak: `npm run build && npm start` yoki `npm run dev`):
 *   npm run stress:auth-post
 *
 * Sozlash:
 *   STRESS_BASE_URL=https://sizning-domen.uz STRESS_USERS=700 npm run stress:auth-post
 *   STRESS_ALLOW_PROD=1 — production URL uchun tasdiq (tasodifiy DDoS bo‘lmasin)
 *
 * STRESS_CONCURRENCY — bir vaqtda ochiq socketlar (default: STRESS_USERS; OS limiti uchun kamaytirish mumkin)
 */
import "dotenv/config";

const BASE = (process.env.STRESS_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const N = Math.max(1, Math.min(50_000, Number(process.env.STRESS_USERS ?? "700")));
const CONCURRENCY = Math.max(
  1,
  Math.min(N, Number(process.env.STRESS_CONCURRENCY ?? String(N))),
);

function assertProdOk() {
  const u = BASE.toLowerCase();
  const isLocal = u.includes("localhost") || u.includes("127.0.0.1");
  const isProdLike = u.includes("vercel.app") || u.startsWith("https://") && !isLocal;
  if (isProdLike && process.env.STRESS_ALLOW_PROD !== "1") {
    console.error(
      "Production/staging URL aniqlandi. Tasodifiy yuk yubormaslik uchun:\n" +
        "  STRESS_ALLOW_PROD=1 qo‘shing yoki faqat lokal URL ishlating.",
    );
    process.exit(1);
  }
}

async function onePost(seq: number): Promise<number> {
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `csrfToken=stress-${seq}&callbackUrl=%2F`,
    redirect: "manual",
  });
  return res.status;
}

async function runPool(total: number, concurrency: number): Promise<number[]> {
  const statuses: number[] = new Array(total);
  let next = 0;

  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= total) break;
      statuses[i] = await onePost(i);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return statuses;
}

async function main() {
  assertProdOk();
  console.log(`BASE=${BASE}`);
  console.log(`users=${N} concurrency=${CONCURRENCY}`);

  const t0 = Date.now();
  const statuses = await runPool(N, CONCURRENCY);
  const ms = Date.now() - t0;

  const hist = new Map<number, number>();
  for (const s of statuses) {
    hist.set(s, (hist.get(s) ?? 0) + 1);
  }

  const byStatus = [...hist.entries()].sort((a, b) => a[0] - b[0]);
  console.log(`\ndone in ${ms}ms (${(N / (ms / 1000)).toFixed(1)} req/s effective)`);
  console.log("status breakdown:");
  for (const [code, count] of byStatus) {
    console.log(`  ${code}: ${count}`);
  }

  const r429 = hist.get(429) ?? 0;
  if (r429 > 0) {
    console.log(`\n429 count=${r429} — IP limiti yoki boshqa rate limit ishlamoqda.`);
  } else {
    console.log("\n429 yo‘q — bu burst uchun middleware POST limiti yetarli bo‘ldi (yoki boshqa sabab).");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
