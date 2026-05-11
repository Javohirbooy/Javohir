/**
 * Quick load probe: N parallel GETs to /testlar and /testlar/[id].
 * Does not simulate logged-in student server actions (begin/submit).
 */
const BASE = process.env.BASE_URL || "https://edu-platform-blond-eight.vercel.app";
const USERS = Number(process.env.USERS || "100");

function extractTestIds(html) {
  const re = /href="\/testlar\/([^"?#/]+)/gi;
  const ids = new Set();
  let m;
  while ((m = re.exec(html))) {
    const id = m[1];
    if (id && id.length > 10) ids.add(id);
  }
  return [...ids];
}

async function main() {
  const listRes = await fetch(`${BASE}/testlar`, {
    headers: { "User-Agent": "iq-loadprobe/1.0" },
  });
  const html = await listRes.text();
  const ids = extractTestIds(html);
  console.log(JSON.stringify({ step: "list", status: listRes.status, testIdCount: ids.length, sample: ids.slice(0, 5) }));

  const testId = ids[0];
  if (!testId) {
    console.error("No test id found in /testlar HTML");
    process.exit(1);
  }

  const t0 = Date.now();
  const tasks = Array.from({ length: USERS }, (_, i) =>
    fetch(`${BASE}/testlar/${testId}`, {
      headers: { "User-Agent": `virtual-user-${i}` },
    })
      .then((res) => ({ i, status: res.status, ms: Date.now() - t0 }))
      .catch((e) => ({ i, err: String(e?.message || e) })),
  );

  const results = await Promise.all(tasks);
  const elapsed = Date.now() - t0;
  const byStatus = {};
  let ok200 = 0;
  let errors = 0;
  const latencies = [];
  for (const x of results) {
    if (x.err) {
      errors += 1;
      continue;
    }
    byStatus[x.status] = (byStatus[x.status] || 0) + 1;
    if (x.status === 200) ok200 += 1;
    latencies.push(x.ms);
  }
  latencies.sort((a, b) => a - b);
  const p = (q) => latencies[Math.floor((latencies.length - 1) * q)] ?? null;

  console.log(
    JSON.stringify({
      step: "parallel_test_detail",
      base: BASE,
      testId,
      users: USERS,
      wallClockMs: elapsed,
      ok200,
      errors,
      byStatus,
      latencyMs: { min: latencies[0], p50: p(0.5), p95: p(0.95), max: latencies[latencies.length - 1] },
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
