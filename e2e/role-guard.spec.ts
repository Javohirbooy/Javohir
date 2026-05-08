import { expect, test } from "@playwright/test";

test.describe("role protection (logged out)", () => {
  test("admin redirects to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/kirish/);
  });

  test("super-admin redirects to login", async ({ page }) => {
    await page.goto("/super-admin");
    await expect(page).toHaveURL(/\/kirish/);
  });

  test("teacher area redirects to login", async ({ page }) => {
    await page.goto("/oqituvchi");
    await expect(page).toHaveURL(/\/kirish/);
  });

  test("student area redirects to login", async ({ page }) => {
    await page.goto("/oquvchi");
    await expect(page).toHaveURL(/\/kirish/);
  });
});
