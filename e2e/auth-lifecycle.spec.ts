import { expect, test } from "@playwright/test";
import {
  createActiveStudent,
  createPasswordResetToken,
  createPendingStudent,
  deleteUserByEmail,
  prisma,
} from "./helpers/seed";
import { ensureStudentTestAttemptPermission } from "./helpers/exam-fixture";

let schemaSupportsAuthFlow = false;

test.describe("auth lifecycle (DB-backed)", () => {
  test.beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT "emailVerified" FROM "User" LIMIT 0`;
      schemaSupportsAuthFlow = true;
      await ensureStudentTestAttemptPermission();
    } catch {
      schemaSupportsAuthFlow = false;
      console.warn(
        "[e2e] User.emailVerified yo‘q yoki DB ulanmagan — auth lifecycle testlari o‘tkazilmaydi. `npx prisma migrate deploy` qo‘llang.",
      );
    }
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("verify email redirect then login as student", async ({ page }) => {
    test.skip(!schemaSupportsAuthFlow, "Schema: emailVerified + AuthToken kerak");
    const email = `e2e-v-${Date.now()}@example.test`;
    const password = "E2E_test_Pass_1";
    try {
      const { plainToken } = await createPendingStudent(email, password, "E2E Verify");
      await page.goto(`/verify-email?token=${encodeURIComponent(plainToken)}`);
      await expect(page).toHaveURL(/\/kirish.*notice=verified/);

      await page.getByLabel(/Email yoki ism-familiya/i).fill(email);
      await page.getByLabel(/^Parol$/i).fill(password);
      await page.getByRole("button", { name: /^Kirish$/i }).click();
      await expect(page).toHaveURL(/\/oquvchi/, { timeout: 30_000 });
    } finally {
      await deleteUserByEmail(email);
    }
  });

  test("register submits and reaches check-email", async ({ page }) => {
    test.skip(!schemaSupportsAuthFlow, "Schema: emailVerified + AuthToken kerak");
    test.skip(process.env.NEXT_PUBLIC_ENABLE_REGISTRATION === "0", "registration disabled");
    const email = `e2e-reg-${Date.now()}@example.test`;
    const password = "E2E_reg_Pass_1";
    try {
      await page.goto("/register");
      await page.getByLabel(/Ism familiya/i).fill("E2E Register");
      await page.getByLabel(/^Email$/i).fill(email);
      await page.getByLabel(/kamida 8 belgi/i).fill(password);
      await page.getByRole("button", { name: /Ro.*yxatdan.*tish/i }).click();
      await expect(page).toHaveURL(/\/kirish.*notice=check-email/, { timeout: 15_000 });
    } finally {
      await deleteUserByEmail(email);
    }
  });

  test("password reset then login with new password", async ({ page }) => {
    test.skip(!schemaSupportsAuthFlow, "Schema: emailVerified + AuthToken kerak");
    const email = `e2e-r-${Date.now()}@example.test`;
    const oldPassword = "E2E_old_Pass_1";
    const newPassword = "E2E_new_Pass_2";
    try {
      await createActiveStudent(email, oldPassword, "E2E Reset");
      const token = await createPasswordResetToken(email);
      await page.goto(`/reset-password?token=${encodeURIComponent(token)}`);
      await page.getByLabel(/^Yangi parol$/i).fill(newPassword);
      await page.getByRole("button", { name: /Parolni saqlash/i }).click();
      await expect(page).toHaveURL(/\/kirish/, { timeout: 20_000 });

      await page.getByLabel(/Email yoki ism-familiya/i).fill(email);
      await page.getByLabel(/^Parol$/i).fill(newPassword);
      await page.getByRole("button", { name: /^Kirish$/i }).click();
      await expect(page).toHaveURL(/\/oquvchi/, { timeout: 30_000 });
    } finally {
      await deleteUserByEmail(email);
    }
  });
});
