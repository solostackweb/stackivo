/**
 * Ask AI — time entry workflow E2E test.
 *
 * Required env:
 *   E2E_USER_EMAIL      -- non-admin user email
 *   E2E_USER_PASSWORD   -- its password
 */

import { test, expect } from "@playwright/test";
import { loginUser, openAiPanel, raceVisible, aiInput, aiSubmit } from "./helpers";

const USER_EMAIL = process.env.E2E_USER_EMAIL;
const USER_PASSWORD = process.env.E2E_USER_PASSWORD;
const HAS_CREDS = Boolean(USER_EMAIL && USER_PASSWORD);

test.describe("Ask AI time entry flow", () => {
  test.skip(!HAS_CREDS, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run Ask AI time entry tests.");

  test("drafts a time entry and shows time tracker link", async ({ page }) => {
    test.setTimeout(90_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);
    await page.getByRole("button", { name: "Log time" }).click();

    const input = aiInput(page);

    // Step 1 — project (optional): use Skip button or type skip
    await expect(page.getByText(/Which project.*log/i).first()).toBeVisible({ timeout: 8_000 });
    const skipBtn = page.getByRole("button", { name: "Skip" }).first();
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
      await expect(input).toHaveValue("", { timeout: 8_000 });
    } else {
      await aiSubmit(page, "skip");
    }

    // Step 2 — what work
    await expect(page.getByText("What work did you do?").first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, "Client calls and wireframe revisions for homepage");

    // Step 3 — duration + billable
    await expect(page.getByText(/How long.*billable/i).first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, "2 hours 30 minutes, billable");

    const result = await raceVisible(
      page,
      ["Time entry drafted", "Could not", "AI draft generation is temporarily unavailable"],
      45_000,
    );
    if (result.includes("Could not") || result.includes("unavailable")) {
      throw new Error(`Time entry draft failed: "${result}"`);
    }

    await expect(page.getByText("Time entry drafted")).toBeVisible();
    await expect(page.getByRole("button", { name: "Open time tracker" })).toBeVisible();
  });

  test("logs time via free-form prompt", async ({ page }) => {
    test.setTimeout(90_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);

    await aiSubmit(page, "Log 1 hour 15 minutes billable time for code review");

    await expect(page.getByText(/code review/i).first()).toBeVisible({ timeout: 10_000 });

    const result = await raceVisible(
      page,
      ["Time entry drafted", "Could not", "What work did you do"],
      45_000,
    );
    if (result.includes("Could not")) {
      throw new Error(`Free-form time log failed: "${result}"`);
    }

    const drafted = await page.getByText("Time entry drafted").isVisible();
    const workflowStarted = await page.getByText(/What work did you do/i).isVisible();
    expect(drafted || workflowStarted).toBe(true);
  });

  test("Open time tracker button navigates to /dashboard/time", async ({ page }) => {
    test.setTimeout(90_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);
    await page.getByRole("button", { name: "Log time" }).click();

    const input = aiInput(page);

    // Step 1 — project (optional)
    await expect(page.getByText(/Which project.*log/i).first()).toBeVisible({ timeout: 8_000 });
    const skipBtn = page.getByRole("button", { name: "Skip" }).first();
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
      await expect(input).toHaveValue("", { timeout: 8_000 });
    } else {
      await aiSubmit(page, "skip");
    }

    // Step 2 — what work
    await expect(page.getByText("What work did you do?").first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, "Design review and feedback session");

    // Step 3 — duration
    await expect(page.getByText(/How long.*billable/i).first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, "1 hour, billable");

    await expect(page.getByText("Time entry drafted")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Open time tracker" }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/dashboard/time"), { timeout: 10_000 });
  });
});
