/**
 * Olimpiada ochiq sahifalariga parallel so‘rovlar (CDN / edge / SSR barqarorligi).
 *
 * Ishlatish:
 *   BASE_URL=https://... USERS=1000 node scripts/load-test-olympiad-public.mjs
 *   PATHS=/olympiada/join,/olympiada (vergul bilan; standart: faqat join)
 *
 * Eslatma: to‘liq imtihon oqimi (autosave, submit) server action + sessiya talab qiladi —
 * bu skript faqat statik/SSR yo‘l va tarmoq xatolarini aniqlash uchun.
 */
const BASE = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const USERS = Math.min(2000, Math.max(1, Number(process.env.USERS || "1000")));
const PATHS = (process.env.PATHS || "/olympiada/join")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);

async function oneUser(i, path, t0) {
  const url = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": `iq-olymp-load/${i}`, Accept: "text/html,*/*" },
      redirect: "manual",
    });
    return { i, path, status: res.status, ms: Date.now() - t0 };
  } catch (e) {
    return { i, path, err: String(e?.message || e) };
  }
}

function summarize(label, results) {
  const latencies = [];
  let errors = 0;
  const byStatus = {};
  for (const x of results) {
    if (x.err) {
      errors += 1;
      continue;
    }
    byStatus[x.status] = (byStatus[x.status] || 0) + 1;
    latencies.push(x.ms);
  }
  latencies.sort((a, b) => a - b);
  const p = (q) => latencies[Math.floor((latencies.length - 1) * q)] ?? null;
  return {
    step: label,
    users: results.length,
    errors,
    byStatus,
    ok200: byStatus[200] || 0,
    redirect3xx: [301, 302, 303, 307, 308].reduce((n, c) => n + (byStatus[c] || 0), 0),
    latencyMs: {
      min: latencies[0],
      p50: p(0.5),
      p95: p(0.95),
      max: latencies[latencies.length - 1],
    },
  };
}

async function main() {
  console.log(JSON.stringify({ base: BASE, users: USERS, paths: PATHS }));

  const all = [];
  const t0 = Date.now();
  for (const path of PATHS) {
    const label = `GET ${path}`;
    const results = await Promise.all(Array.from({ length: USERS }, (_, i) => oneUser(i, path, Date.now())));
    const out = summarize(label, results);
    out.wallClockMs = Date.now() - t0;
    all.push(out);
    console.log(JSON.stringify(out, null, 2));
  }

  const totalErr = all.reduce((s, x) => s + x.errors, 0);
  if (totalErr > 0) {
    console.error(`Yakun: ${totalErr} ta so‘rovda xato (tarmoq / timeout / DNS).`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
