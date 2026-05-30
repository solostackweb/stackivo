/**
 * Ask AI invoice workflow E2E test.
 *
 * Required env:
 *   E2E_USER_EMAIL       -- non-admin user email
 *   E2E_USER_PASSWORD    -- its password
 *   E2E_AI_CLIENT_NAME   -- client display name available in workspace
 */

import { test, expect } from "@playwright/test";
import { loginUser, openAiPanel, aiInput } from "./helpers";

const USER_EMAIL = process.env.E2E_USER_EMAIL;
const USER_PASSWORD = process.env.E2E_USER_PASSWORD;
const CLIENT_NAME = process.env.E2E_AI_CLIENT_NAME;
const HAS_CREDS = Boolean(USER_EMAIL && USER_PASSWORD && CLIENT_NAME);

test.describe("Ask AI invoice flow", () => {
  test.skip(
    !HAS_CREDS,
    "Set E2E_USER_EMAIL, E2E_USER_PASSWORD, and E2E_AI_CLIENT_NAME to run Ask AI tests.",
  );

  test("creates and approves an invoice draft via Ask AI", async ({ page }) => {
    test.setTimeout(120_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);

    await expect(page.getByRole("button", { name: "Create invoice" })).toBeVisible();
    await page.getByRole("button", { name: "Create invoice" }).click();

    const promptInput = aiInput(page);
    await expect(promptInput).toBeVisible();
    await promptInput.fill(
      `Invoice ${CLIENT_NAME} 50000 for landing page design, due in 15 days`,
    );
    await promptInput.press("Enter");

    const draftHeading = page.getByText("Draft invoice ready for approval");
    const clientPickerTitle = page.getByText("Which client is this invoice for?");
    const missingAmount = page.getByText(/Add an invoice amount/i);
    const schemaCacheError = page.getByText(/discount_amount.+schema cache/i);
    const aiUnavailable = page.getByText(/AI draft generation is temporarily unavailable/i);
    const genericFailure = page.getByText(/Could not create invoice/i);

    await Promise.race([
      draftHeading.waitFor({ state: "visible", timeout: 60_000 }),
      clientPickerTitle.waitFor({ state: "visible", timeout: 60_000 }),
      missingAmount.waitFor({ state: "visible", timeout: 60_000 }),
      schemaCacheError.waitFor({ state: "visible", timeout: 60_000 }),
      aiUnavailable.waitFor({ state: "visible", timeout: 60_000 }),
      genericFailure.waitFor({ state: "visible", timeout: 60_000 }),
    ]);

    if (await clientPickerTitle.isVisible()) {
      const pickerSelect = page.locator("select").filter({ hasText: "Choose a client" }).first();
      await expect(pickerSelect).toBeVisible();
      await pickerSelect.selectOption({ label: CLIENT_NAME! });
      await page.getByRole("button", { name: "Use selected client" }).click();
      await expect(draftHeading).toBeVisible({ timeout: 30_000 });
    }

    if (await schemaCacheError.isVisible()) {
      throw new Error("Supabase schema cache is missing discount_amount. Run supabase db reset or ensure migrations are applied.");
    }
    if (await aiUnavailable.isVisible()) throw new Error("AI draft generation is temporarily unavailable.");
    if (await genericFailure.isVisible()) throw new Error("Ask AI could not create the invoice draft.");
    if (await missingAmount.isVisible()) throw new Error("Ask AI invoice prompt did not include a recognizable amount.");

    await expect(page.getByRole("button", { name: "Approve invoice" })).toBeVisible();
    await page.getByRole("button", { name: "Approve invoice" }).click();

    const approveSuccess = page.getByText("Invoice approved");
    const approveError = page.getByText(/could not approve|approval failed/i);
    await Promise.race([
      approveSuccess.waitFor({ state: "visible", timeout: 25_000 }),
      approveError.waitFor({ state: "visible", timeout: 25_000 }),
    ]);
    if ((await approveError.isVisible()) && !(await approveSuccess.isVisible())) {
      throw new Error(`Invoice approval failed: ${await approveError.textContent()}`);
    }
    await expect(approveSuccess).toBeVisible({ timeout: 5_000 });

    await expect(page.getByRole("button", { name: "Email" })).toBeVisible();
    await expect(page.getByRole("button", { name: "WhatsApp" })).toBeVisible();
  });

  test("invoice WhatsApp button opens WhatsApp in a new tab", async ({ page, context }) => {
    test.setTimeout(120_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);

    await page.getByRole("button", { name: "Create invoice" }).click();

    const promptInput = aiInput(page);
    await expect(promptInput).toBeVisible();
    await promptInput.fill(`Invoice ${CLIENT_NAME} 25000 for branding design, due in 7 days`);
    await promptInput.press("Enter");

    await expect(page.getByText("Draft invoice ready for approval")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Approve invoice" }).click();
    await expect(page.getByText("Invoice approved")).toBeVisible({ timeout: 25_000 });

    const [newPage] = await Promise.all([
      context.waitForEvent("page", { timeout: 15_000 }),
      page.getByRole("button", { name: "WhatsApp" }).click(),
    ]);
    // Accept both wa.me and api.whatsapp.com URL formats
    expect(newPage.url()).toMatch(/whatsapp\.com|wa\.me/);
  });

  test("invoice email send completes after approval", async ({ page }) => {
    test.setTimeout(120_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);

    await page.getByRole("button", { name: "Create invoice" }).click();

    const promptInput = aiInput(page);
    await promptInput.fill(`Invoice ${CLIENT_NAME} 15000 for content writing, due in 10 days`);
    await promptInput.press("Enter");

    await expect(page.getByText("Draft invoice ready for approval")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Approve invoice" }).click();
    await expect(page.getByText("Invoice approved")).toBeVisible({ timeout: 25_000 });

    await page.getByRole("button", { name: "Email" }).click();

    await expect(page.getByText(/Done\.|emailed|invoice sent/i)).toBeVisible({ timeout: 20_000 });
  });
});
