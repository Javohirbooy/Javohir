import { expect, test } from "@playwright/test";
import {
  createActiveStudentInGrade,
  createPublishedTestForStudentGrade,
  deleteExamFixture,
  ensureStudentTestAttemptPermission,
} from "./helpers/exam-fixture";
import { deleteUserByEmail, prisma } from "./helpers/seed";

test.describe("student exam flow (DB-backed)", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("login → test sahifasi → javoblar → yakunlash → natija %", async ({ page }) => {
    test.setTimeout(90_000);
    const email = `e2e-exam-${Date.now()}@example.test`;
    const password = "E2E_exam_Pass_1";
    let gradeId = "";
    let testId = "";
    try {
      await ensureStudentTestAttemptPermission();
      const fx = await createPublishedTestForStudentGrade();
      gradeId = fx.gradeId;
      testId = fx.testId;
      await createActiveStudentInGrade(email, password, "E2E Exam Student", gradeId);

      await page.goto("/kirish");
      await page.getByLabel(/Email yoki ism-familiya/i).fill(email);
      await page.getByLabel(/^Parol$/i).fill(password);
      await page.getByRole("button", { name: /^Kirish$/i }).click();
      await expect(page).toHaveURL(/\/oquvchi/, { timeout: 20_000 });

      await page.goto(`/testlar/${testId}`);
      await expect(page).toHaveURL(new RegExp(`/testlar/${testId}`), { timeout: 15_000 });
      await expect(page.getByText(/sessiyasi tayyorlanmoqda/i)).not.toBeVisible({ timeout: 45_000 });
      await expect(page.getByText(/Ruxsat yo‘q|Kirish kerak|Faqat o‘quvchilar/i)).toHaveCount(0);

      const optionGrid = page.locator("div.mt-5.grid").first();
      await expect(optionGrid.getByRole("button").first()).toBeVisible({ timeout: 15_000 });

      // Savol 1: to‘g‘ri javob — "4" (ikkinchi variant, B)
      await optionGrid.getByRole("button").nth(1).click();
      await page.getByRole("button", { name: /^Keyingi$/ }).click();

      // Savol 2: "Paris"
      await page.locator("div.mt-5.grid.gap-3").first().getByRole("button").nth(1).click();
      await page.getByRole("button", { name: /^Yakunlash$/ }).click();

      await expect(page.getByText(/^Natija$/)).toBeVisible({ timeout: 25_000 });
      await expect(page.getByText("100%")).toBeVisible();
      await expect(page.getByText(/2\s*\/\s*2\s*savol to‘g‘ri/)).toBeVisible();
    } finally {
      await deleteUserByEmail(email);
      if (gradeId && testId) {
        await deleteExamFixture(testId, gradeId);
      }
    }
  });
});
