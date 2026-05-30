/**
 * Ask AI — project creation workflow E2E test.
 *
 * Required env:
 *   E2E_USER_EMAIL      -- non-admin user email
 *   E2E_USER_PASSWORD   -- its password
 *   E2E_AI_CLIENT_NAME  -- (optional) client name to link the project to
 */

import { test, expect } from "@playwright/test";
import { loginUser, openAiPanel, raceVisible, aiInput, aiSubmit } from "./helpers";

const USER_EMAIL = process.env.E2E_USER_EMAIL;
const USER_PASSWORD = process.env.E2E_USER_PASSWORD;
const CLIENT_NAME = process.env.E2E_AI_CLIENT_NAME ?? "";
const HAS_CREDS = Boolean(USER_EMAIL && USER_PASSWORD);

const UNIQUE_SUFFIX = Date.now().toString().slice(-5);
const TEST_PROJECT_NAME = `E2E Project ${UNIQUE_SUFFIX}`;

test.describe("Ask AI project flow", () => {
  test.skip(!HAS_CREDS, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run Ask AI project tests.");

  test("creates a project record from chat", async ({ page }) => {
    test.setTimeout(90_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);
    await page.getByRole("button", { name: "Add project" }).click();

    const input = aiInput(page);

    // Step 1 — client (optional)
    await expect(page.getByText(/Which client.*project/i).first()).toBeVisible({ timeout: 8_000 });
    if (CLIENT_NAME) {
      const sel = page.locator("select").first();
      if (await sel.isVisible().catch(() => false)) {
        await sel.selectOption({ label: CLIENT_NAME }).catch(() => {});
      }
    }
    await aiSubmit(page, CLIENT_NAME || "skip");

    // Step 2 — project name
    await expect(page.getByText("Project name?").first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, TEST_PROJECT_NAME);

    // Step 3 — scope
    await expect(page.getByText(/Goal.*scope/i).first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, "Full-stack web app, user auth, dashboard, REST API, deployment on Vercel");

    // Step 4 — status (choice chip): click chip, then submit
    await expect(page.getByText("What stage?").first()).toBeVisible({ timeout: 8_000 });
    await page.getByRole("button", { name: "Planning" }).click();
    await aiSubmit(page); // submits chip value

    // Step 5 — dates (optional)
    await expect(page.getByText(/Start and due date/i).first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, "starts next Monday, due in 6 weeks");

    const result = await raceVisible(page, ["Project created", "Could not", "Tell me about the project"], 45_000);
    if (result.includes("Could not") || result.includes("Tell me")) {
      throw new Error(`Project creation failed: "${result}"`);
    }

    await expect(page.getByText("Project created")).toBeVisible();
    await page.getByRole("button", { name: "Open projects" }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/dashboard/projects"), { timeout: 10_000 });
  });

  test("creates a project via free-form prompt in general mode", async ({ page }) => {
    test.setTimeout(90_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);

    await aiSubmit(page, `Create a new project called "Branding Refresh ${UNIQUE_SUFFIX}", active status, 4-week timeline`);

    await expect(page.getByText(/Branding Refresh/i).first()).toBeVisible({ timeout: 10_000 });

    const result = await raceVisible(page, ["Project created", "Could not", "Project name"], 45_000);
    if (result.includes("Could not")) {
      throw new Error(`Free-form project creation failed: "${result}"`);
    }

    const assistantMessages = page.locator(".mr-auto.bg-muted\\/60");
    expect(await assistantMessages.count()).toBeGreaterThan(1);
  });
});
