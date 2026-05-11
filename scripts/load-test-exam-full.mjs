/**
 * Yuk sinovi: N ta "virtual user" parallel
 * 1) GET /testlar → testId
 * 2) GET /testlar/[id] (mehmon yoki preview)
 * Agar STUDENT_EMAIL + STUDENT_PASSWORD berilsa:
 * 3) Har bir user uchun alohida CSRF + credentials login + GET /testlar/[id] (cookie bilan)
 *
 * To'liq savol-javob + submitNext.js server action talab qiladi — bu skript faqat tarmoq/auth/barqarorlikni tekshiradi.
 *
 * Ishlatish:
 *   BASE_URL=https://... USERS=100 node scripts/load-test-exam-full.mjs
 *   STUDENT_EMAIL=... STUDENT_PASSWORD=... (ixtiyoriy)
 *   TEST_ID=cuid (ixtiyoriy; bo'lmasa ro'yxatdan olinadi)
 */
const BASE = (process.env.BASE_URL || "https://edu-platform-blond-eight.vercel.app").replace(/\/$/, "");
const USERS = Math.min(500, Math.max(1, Number(process.env.USERS || "100")));
const STUDENT_EMAIL = process.env.STUDENT_EMAIL?.trim();
const STUDENT_PASSWORD = process.env.STUDENT_PASSWORD?.trim();
const TEST_ID_ENV = process.env.TEST_ID?.trim();

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

function mergeSetCookie(headers) {
  const list = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  if (list.length) {
    return list.map((c) => c.split(";")[0]).join("; ");
  }
  const sc = headers.get("set-cookie");
  if (!sc) return "";
  return sc
    .split(/,(?=[^;]+?=)/)
    .map((c) => c.trim().split(";")[0])
    .join("; ");
}

async function fetchTestId() {
  if (TEST_ID_ENV) return TEST_ID_ENV;
  const r = await fetch(`${BASE}/testlar`, { headers: { "User-Agent": "iq-load-full/1" } });
  const html = await r.text();
  const ids = extractTestIds(html);
  if (!ids[0]) throw new Error("testlar ro'yxatidan testId topilmadi");
  return ids[0];
}

async function virtualUserDetailOnly(i, testId, t0) {
  try {
    const res = await fetch(`${BASE}/testlar/${testId}`, {
      headers: { "User-Agent": `iq-vu-${i}`, Accept: "text/html,*/*" },
    });
    return { i, status: res.status, ms: Date.now() - t0 };
  } catch (e) {
    return { i, err: String(e?.message || e) };
  }
}

async function loginAndOpenTest(i, testId, t0) {
  try {
    const jar0 = await fetch(`${BASE}/api/auth/csrf`, {
      headers: { "User-Agent": `iq-vu-${i}` },
    });
    const csrfJson = await jar0.json();
    const token = csrfJson.csrfToken;
    if (!token) return { i, err: "no_csrf" };
    let cookie = mergeSetCookie(jar0.headers);

    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: "POST",
      redirect: "manual",
      headers: {
        "User-Agent": `iq-vu-${i}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Auth-Return-Redirect": "1",
        Cookie: cookie,
      },
      body: new URLSearchParams({
        csrfToken: token,
        callbackUrl: `${BASE}/oquvchi`,
        identifier: STUDENT_EMAIL,
        password: STUDENT_PASSWORD,
      }),
    });
    const loginCookie = mergeSetCookie(loginRes.headers);
    cookie = [cookie, loginCookie].filter(Boolean).join("; ");

    const okLogin =
      loginRes.ok ||
      loginRes.status === 302 ||
      loginRes.status === 307 ||
      loginRes.status === 308 ||
      (loginRes.headers.get("content-type") || "").includes("json");
    if (!okLogin && loginRes.status !== 0) {
      return { i, err: `login_${loginRes.status}`, ms: Date.now() - t0 };
    }

    const pageRes = await fetch(`${BASE}/testlar/${testId}`, {
      headers: { "User-Agent": `iq-vu-${i}`, Cookie: cookie, Accept: "text/html,*/*" },
      redirect: "manual",
    });
    return { i, status: pageRes.status, ms: Date.now() - t0, phase: "auth+page" };
  } catch (e) {
    return { i, err: String(e?.message || e) };
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
    users: USERS,
    errors,
    byStatus,
    ok200: byStatus[200] || 0,
    latencyMs: { min: latencies[0], p50: p(0.5), p95: p(0.95), max: latencies[latencies.length - 1] },
  };
}

async function main() {
  const testId = await fetchTestId();
  console.log(JSON.stringify({ base: BASE, testId, users: USERS, auth: Boolean(STUDENT_EMAIL && STUDENT_PASSWORD) }));

  const t0 = Date.now();
  let results;
  if (STUDENT_EMAIL && STUDENT_PASSWORD) {
    results = await Promise.all(Array.from({ length: USERS }, (_, i) => loginAndOpenTest(i, testId, t0)));
  } else {
    results = await Promise.all(Array.from({ length: USERS }, (_, i) => virtualUserDetailOnly(i, testId, t0)));
  }
  const wall = Date.now() - t0;
  const out = summarize(STUDENT_EMAIL ? "parallel_auth_and_test_page" : "parallel_get_test_detail", results);
  out.wallClockMs = wall;
  console.log(JSON.stringify(out, null, 0));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
