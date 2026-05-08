import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("home renders on narrow viewport", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});

test("login renders on narrow viewport", async ({ page }) => {
  await page.goto("/kirish");
  await expect(page.getByRole("heading", { name: /tizimga kirish/i })).toBeVisible();
});

test.describe("tablet", () => {
  test.use({ viewport: { width: 820, height: 1180 } });

  test("home and tests hub", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    await page.goto("/testlar");
    await expect(page.locator("body")).toBeVisible();
  });
});
