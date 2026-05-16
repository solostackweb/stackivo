import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for Founder Console smoke tests.
 *
 * Strategy:
 *   - Run against a locally-spun `npm run dev` server (port 3000).
 *   - Single browser (Chromium) — these are smoke tests, not cross-
 *     browser coverage. Adding Firefox/WebKit later is one option line.
 *   - Tests live in `e2e/admin/`. The webServer option starts the dev
 *     server if it isn't already running.
 *
 * Required env for the suite:
 *   - E2E_ADMIN_EMAIL       — pre-promoted admin account email
 *   - E2E_ADMIN_PASSWORD    — its password
 *   - E2E_BASE_URL          — optional override (default http://localhost:3000)
 *
 * The suite SKIPS itself when those env vars are absent, so the
 * default `npm run test:e2e` is safe to run on any dev machine.
 */

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Spin up the dev server when running against localhost. CI / staging
  // runs should set E2E_BASE_URL to skip this.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
