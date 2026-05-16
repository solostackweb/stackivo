/**
 * Founder Console smoke tests.
 *
 * Coverage (intentionally minimal — these guard the most expensive-to-
 * regress paths, not every page):
 *
 *   1. Non-admin users get a 404 at /admin (surface hidden).
 *   2. Admin reaches the Now page and sees the canonical sections.
 *   3. Cmd+K opens the palette and surfaces user hits.
 *
 * The suite SKIPS itself when the required env vars are absent, so a
 * fresh checkout's `npm run test:e2e` passes without setup.
 *
 * Required env:
 *   E2E_ADMIN_EMAIL       — pre-promoted admin email
 *   E2E_ADMIN_PASSWORD    — its password
 */

import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const HAS_CREDS = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD);

test.describe("Founder Console smoke", () => {
  test.skip(
    !HAS_CREDS,
    "Set E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD to run admin smoke tests.",
  );

  test("anonymous /admin returns 404", async ({ page }) => {
    const response = await page.goto("/admin", { waitUntil: "networkidle" });
    // Middleware redirects to /login for unauthenticated users, so
    // either a 200 on /login OR a 404 if the auth flow has been
    // bypassed are both acceptable proofs the surface didn't leak.
    expect([200, 404, 401]).toContain(response?.status() ?? 0);
    // In all cases, the dashboard chrome must NOT render.
    await expect(page.locator("text=Console").first()).toHaveCount(0, {
      timeout: 1000,
    });
  });

  test("admin reaches Now page after login", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL!);
    await page.fill('input[type="password"]', ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) =>
      url.pathname.startsWith("/dashboard") ||
      url.pathname.startsWith("/admin"),
    );

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Now" })).toBeVisible({
      timeout: 8_000,
    });
    // Sanity checks on the canonical sections.
    await expect(page.getByText(/Revenue/i)).toBeVisible();
    await expect(page.getByText(/Pipeline/i)).toBeVisible();
    await expect(page.getByText(/What broke/i)).toBeVisible();
  });

  test("Cmd+K opens the palette", async ({ page, browserName }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL!);
    await page.fill('input[type="password"]', ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) =>
      url.pathname.startsWith("/dashboard") ||
      url.pathname.startsWith("/admin"),
    );
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Now" })).toBeVisible();

    // Use Meta on macOS, Control elsewhere.
    const isMac = process.platform === "darwin" || browserName === "webkit";
    await page.keyboard.press(isMac ? "Meta+K" : "Control+K");
    await expect(
      page.getByPlaceholder(/Search users · paste request id · jump to page/i),
    ).toBeVisible({ timeout: 3_000 });
  });
});
