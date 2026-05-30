/**
 * Ask AI — client creation workflow E2E test.
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

const UNIQUE_SUFFIX = Date.now().toString().slice(-5);
const TEST_CLIENT_NAME = `E2E Test Client ${UNIQUE_SUFFIX}`;

test.describe("Ask AI client flow", () => {
  test.skip(!HAS_CREDS, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run Ask AI client tests.");

  test("creates a client record from chat", async ({ page }) => {
    test.setTimeout(90_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);
    await page.getByRole("button", { name: "Add client" }).click();

    // Step 1 — name
    await expect(page.getByText("Client or contact name?").first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, TEST_CLIENT_NAME);

    // Step 2 — business (optional)
    await expect(page.getByText(/Business or company name/i).first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, `${TEST_CLIENT_NAME} Corp`);

    // Step 3 — contact (optional)
    await expect(page.getByText(/Email and phone/i).first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, `e2etest${UNIQUE_SUFFIX}@example.com, +91 9876500000`);

    // Step 4 — billing (optional)
    await expect(page.getByText(/Billing address/i).first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, "Mumbai, Maharashtra");

    // Step 5 — notes (optional)
    await expect(page.getByText(/Notes about this client/i).first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, "Automated E2E test client — can be deleted");

    // Race against success vs error
    const result = await raceVisible(page, ["Client created", "Could not", "Tell me about the client"], 60_000);
    if (result.includes("Could not") || result.includes("Tell me about")) {
      throw new Error(`Client creation failed: "${result}"`);
    }

    await expect(page.getByText("Client created")).toBeVisible();
    await page.getByRole("button", { name: "Open clients" }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/dashboard/clients"), { timeout: 10_000 });
  });

  test("creates a client via free-form prompt in general mode", async ({ page }) => {
    test.setTimeout(90_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);

    await aiSubmit(
      page,
      `Add a new client called FreeForm Client ${UNIQUE_SUFFIX}, email ff${UNIQUE_SUFFIX}@example.com, based in Delhi`,
    );

    // Wait for user message echo (confirms submission was processed)
    await expect(page.getByText(/FreeForm Client/i).first()).toBeVisible({ timeout: 10_000 });

    // Wait for AI response
    const result = await raceVisible(page, ["Client created", "Could not", "Client or contact name"], 45_000);
    if (result.includes("Could not")) {
      throw new Error(`Free-form client creation failed: "${result}"`);
    }

    const assistantMessages = page.locator(".mr-auto.bg-muted\\/60");
    expect(await assistantMessages.count()).toBeGreaterThan(1);
  });
});
