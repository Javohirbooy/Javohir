import { expect, test } from "@playwright/test";

test.describe("public pages", () => {
  test("home loads", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/kirish");
    await expect(page.getByRole("heading", { name: /tizimga kirish/i })).toBeVisible();
  });

  test("contact page loads", async ({ page }) => {
    await page.goto("/aloqa");
    await expect(page.getByRole("heading", { name: /aloqa/i })).toBeVisible();
  });

  test("health endpoint", async ({ request }) => {
    const res = await request.get("/api/health");
    expect([200, 503]).toContain(res.status());
    const json = (await res.json()) as { status?: string; database?: boolean };
    expect(["ok", "degraded"]).toContain(json.status);
    if (json.status === "ok") {
      expect(res.status()).toBe(200);
      expect(json.database).toBe(true);
    }
  });
});
