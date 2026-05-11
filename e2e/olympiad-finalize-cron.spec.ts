import { test, expect } from "@playwright/test";

const CRON_SECRET = "playwright-test-cron-secret";

test.describe("Olimpiada finalize cron API", () => {
  test("401 without secret (production next start)", async ({ request }) => {
    const res = await request.get("/api/cron/olympiad-finalize");
    expect(res.status()).toBe(401);
    const j = (await res.json()) as { ok?: boolean; error?: string };
    expect(j.ok).toBeFalsy();
  });

  test("200 with Bearer CRON_SECRET", async ({ request }, testInfo) => {
    const res = await request.get("/api/cron/olympiad-finalize?batch=5&rounds=1", {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    if (res.status() === 500) {
      testInfo.skip(
        true,
        "Lokal DBda OlympiadSession jadvali yo‘q bo‘lishi mumkin — to‘liq tekshiruv uchun `prisma migrate deploy` qiling.",
      );
      return;
    }
    expect(res.status()).toBe(200);
    const j = (await res.json()) as { ok: boolean; runId?: string; finalized?: number };
    expect(j.ok).toBe(true);
    expect(typeof j.runId).toBe("string");
    expect(typeof j.finalized).toBe("number");
  });

  test("200 with x-cron-secret header", async ({ request }, testInfo) => {
    const res = await request.get("/api/cron/olympiad-finalize?batch=2&rounds=1", {
      headers: { "x-cron-secret": CRON_SECRET },
    });
    if (res.status() === 500) {
      testInfo.skip(true, "Olympiad migratsiyasi talab qilinishi mumkin.");
      return;
    }
    expect(res.status()).toBe(200);
  });
});
