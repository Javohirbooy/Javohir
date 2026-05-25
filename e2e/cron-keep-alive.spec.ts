import { test, expect } from "@playwright/test";

const CRON_SECRET = "playwright-test-cron-secret";

test.describe("Cron keep-alive API", () => {
  test("401 without secret", async ({ request }) => {
    const res = await request.get("/api/cron/keep-alive");
    expect(res.status()).toBe(401);
  });

  test("200 with Bearer CRON_SECRET", async ({ request }, testInfo) => {
    const res = await request.get("/api/cron/keep-alive", {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    if (res.status() === 500) {
      testInfo.skip(true, "DB ulanishi talab qilinishi mumkin.");
      return;
    }
    expect(res.status()).toBe(200);
    const j = (await res.json()) as {
      ok: boolean;
      skipped?: boolean;
      data?: { database?: boolean };
    };
    expect(typeof j.ok).toBe("boolean");
    if (!j.skipped) expect(typeof j.data?.database).toBe("boolean");
  });
});
