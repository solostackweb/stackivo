/**
 * Ask AI — project creation workflow E2E test.
 *
 * Exercises single-prompt field extraction and the explicit "ask for the
 * missing name" loop.
 *
 * Required env:
 *   E2E_USER_EMAIL      -- non-admin user email
 *   E2E_USER_PASSWORD   -- its password
 */

import { test, expect } from "@playwright/test";
import { loginUser, openAiPanel, raceVisible, aiSubmit } from "./helpers";

const USER_EMAIL = process.env.E2E_USER_EMAIL;
const USER_PASSWORD = process.env.E2E_USER_PASSWORD;
const HAS_CREDS = Boolean(USER_EMAIL && USER_PASSWORD);

const UNIQUE_SUFFIX = Date.now().toString().slice(-5);
const TEST_PROJECT_NAME = `E2E Project ${UNIQUE_SUFFIX}`;

test.describe("Ask AI project flow", () => {
  test.skip(!HAS_CREDS, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run Ask AI project tests.");

  test("creates a project from a single prompt", async ({ page }) => {
    test.setTimeout(90_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);
    await page.getByRole("button", { name: "Add project" }).click();

    await expect(page.getByText(/Let's create a project/i).first()).toBeVisible({ timeout: 8_000 });

    await aiSubmit(
      page,
      `Create a project called ${TEST_PROJECT_NAME}, scope is a full-stack web app with auth, dashboard and REST API, status active, starts next Monday and due in 6 weeks`,
    );

    const result = await raceVisible(
      page,
      ["Project created", "Could not", "Tell me about the project", "What should I name this project"],
      60_000,
    );
    if (result.includes("Could not") || result.includes("Tell me")) {
      throw new Error(`Project creation failed: "${result}"`);
    }

    await expect(page.getByText("Project created")).toBeVisible();
    await expect(page.getByText(new RegExp(`${TEST_PROJECT_NAME} is ready`, "i"))).toBeVisible();
    await page.getByRole("button", { name: "Open projects" }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/dashboard/projects"), { timeout: 25_000 });
  });

  test("asks for the project name when it is missing", async ({ page }) => {
    test.setTimeout(90_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);
    await page.getByRole("button", { name: "Add project" }).click();

    await expect(page.getByText(/Let's create a project/i).first()).toBeVisible({ timeout: 8_000 });

    await aiSubmit(page, "I need to set up a new project, scope is branding work");

    await expect(page.getByText(/What should I name this project/i).first()).toBeVisible({ timeout: 30_000 });
    await aiSubmit(page, TEST_PROJECT_NAME);

    const result = await raceVisible(page, ["Project created", "Could not"], 60_000);
    if (result.includes("Could not")) {
      throw new Error(`Project creation failed after name prompt: "${result}"`);
    }
    await expect(page.getByText("Project created")).toBeVisible();
  });

  test("creates a project via free-form prompt in general mode", async ({ page }) => {
    test.setTimeout(90_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);

    await aiSubmit(page, `Create a new project called "Branding Refresh ${UNIQUE_SUFFIX}", active status, 4-week timeline`);

    await expect(page.getByText(/Branding Refresh/i).first()).toBeVisible({ timeout: 10_000 });

    const result = await raceVisible(page, ["Project created", "Could not", "What should I name this project"], 60_000);
    if (result.includes("Could not")) {
      throw new Error(`Free-form project creation failed: "${result}"`);
    }
    await expect(page.getByText("Project created")).toBeVisible({ timeout: 5_000 });
  });
});
