import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for Stackivo E2E tests.
 *
 * Test directories:
 *   e2e/admin/  — founder console smoke tests
 *   e2e/ai/     — Ask AI workflow tests (invoice, contract, welcome doc,
 *                  client, project, time entry, support)
 *
 * The suite self-skips when required env vars are absent, so a fresh
 * checkout's `npm run test:e2e` passes without any setup.
 *
 * Required env (admin smoke):
 *   E2E_ADMIN_EMAIL       — pre-promoted admin email
 *   E2E_ADMIN_PASSWORD    — its password
 *
 * Required env (AI workflows):
 *   E2E_USER_EMAIL        — non-admin user email
 *   E2E_USER_PASSWORD     — its password
 *   E2E_AI_CLIENT_NAME    — client display name present in that workspace
 *                           (used by invoice, contract, welcome doc tests)
 *
 * Optional:
 *   E2E_BASE_URL          — override base URL (default http://localhost:3000)
 *
 * AI tests call Groq and run Supabase writes; they are intentionally
 * serial in CI (workers: 1) to avoid rate-limiting and data races.
 */

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // AI tests hit external APIs — keep serial in CI to avoid rate limits.
  // Cap at 2 workers locally to avoid overwhelming the dev/EC2 server with
  // simultaneous logins (all 18 tests logging in at once causes waitForURL
  // timeouts even on a fast machine).
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? "dot" : "list",
  // Default timeout per test. Individual AI tests override with
  // test.setTimeout(120_000) because Groq inference + DB writes can be slow.
  timeout: 60_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Spin up the dev server when running against localhost.
  // CI / staging runs should set E2E_BASE_URL to skip this.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
