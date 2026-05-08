const { execSync } = require("node:child_process");

/**
 * Faqat GitHub Actions (`GITHUB_ACTIONS=true`): servis Postgres bo‘sh, `migrate deploy` xavfsiz.
 * Lokal / Neon: migratsiyani qo‘lda; schema mos kelmasa auth-lifecycle testlari skip.
 */
module.exports = async function globalSetup() {
  if (process.env.SKIP_E2E_GLOBAL_MIGRATE === "1") return;
  if (process.env.GITHUB_ACTIONS !== "true") {
    console.log(
      "[e2e] GITHUB_ACTIONS emas — avtomatik migrate yo‘q. Schema mos emas bo‘lsa, auth-lifecycle skip qilinadi.",
    );
    return;
  }
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: process.env,
  });
};
