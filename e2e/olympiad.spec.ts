import { test, expect } from "@playwright/test";

test.describe("Olimpiada ochiq oqim", () => {
  test("join sahifasi ochiladi va asosiy maydonlar mavjud", async ({ page }) => {
    await page.goto("/olympiada/join");
    await expect(page.getByRole("heading", { name: /Olimpiadaga qo‘shilish/i })).toBeVisible();
    await expect(page.getByLabel(/^Ism$/i)).toBeVisible();
    await expect(page.getByLabel(/Familiya/i)).toBeVisible();
    await expect(page.getByLabel(/Olimpiada kodi/i)).toBeVisible();
  });

  test("join mobil viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/olympiada/join");
    await expect(page.getByRole("heading", { name: /Olimpiadaga qo‘shilish/i })).toBeVisible();
  });
});
