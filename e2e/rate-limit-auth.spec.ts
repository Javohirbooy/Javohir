import { expect, test } from "@playwright/test";

/**
 * Middleware `POST /api/auth/*` uchun IP bucket (~80 / 15m).
 * Noto‘g‘ri body ham so‘rov sifatida hisoblanadi (bruteforce oldini olish).
 */
test("auth POST flood eventually returns 429 with Retry-After", async ({ request }) => {
  test.setTimeout(120_000);
  let lastStatus = 0;
  let saw429 = false;
  for (let i = 0; i < 120; i++) {
    const res = await request.post("/api/auth/callback/credentials", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: "csrfToken=invalid&callbackUrl=%2F",
    });
    lastStatus = res.status();
    if (lastStatus === 429) {
      saw429 = true;
      expect(res.headers()["retry-after"]).toBeTruthy();
      break;
    }
  }
  expect(saw429, `expected 429 after flood, last status was ${lastStatus}`).toBe(true);
});
