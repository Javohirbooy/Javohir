import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  /** `rate-limit-auth` alohida `npm run test:e2e:stress` — POST /api/auth bucketini to‘ldiradi. */
  testIgnore: "**/rate-limit-auth.spec.ts",
  globalSetup: "./e2e/global-setup.js",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node scripts/start-test-server.mjs",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      E2E_RELAX_SERVER_ACTION_RATE_LIMIT: "1",
      /** `next start` production assert: http preview + no VERCEL_URL */
      ALLOW_INSECURE_SITE_URL: "1",
      /** Cron route authorization in production `next start` */
      CRON_SECRET: "playwright-test-cron-secret",
    },
  },
});
