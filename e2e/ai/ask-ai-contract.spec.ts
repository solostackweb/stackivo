/**
 * Ask AI — contract workflow E2E test.
 *
 * Required env:
 *   E2E_USER_EMAIL        -- non-admin user email
 *   E2E_USER_PASSWORD     -- its password
 *   E2E_AI_CLIENT_NAME    -- client display name present in the workspace
 */

import { test, expect } from "@playwright/test";
import { loginUser, openAiPanel, raceVisible, aiInput, aiSubmit } from "./helpers";

const USER_EMAIL = process.env.E2E_USER_EMAIL;
const USER_PASSWORD = process.env.E2E_USER_PASSWORD;
const CLIENT_NAME = process.env.E2E_AI_CLIENT_NAME;
const HAS_CREDS = Boolean(USER_EMAIL && USER_PASSWORD && CLIENT_NAME);

test.describe("Ask AI contract flow", () => {
  test.skip(!HAS_CREDS, "Set E2E_USER_EMAIL, E2E_USER_PASSWORD, and E2E_AI_CLIENT_NAME to run Ask AI contract tests.");

  test("drafts a contract and shows full preview with delivery options", async ({ page }) => {
    test.setTimeout(120_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);
    await page.getByRole("button", { name: "Draft contract" }).click();

    const input = aiInput(page);

    // Step 1 — client: select from dropdown then submit name as text answer
    await expect(page.getByText("Who is this contract or proposal for?").first()).toBeVisible({ timeout: 8_000 });
    const clientSelect = page.locator("select").first();
    const selectVisible = await clientSelect.isVisible().catch(() => false);
    if (selectVisible) await clientSelect.selectOption({ label: CLIENT_NAME! }).catch(() => {});
    await aiSubmit(page, CLIENT_NAME!);

    // Step 2 — project (optional): click Skip button or type skip
    await expect(page.getByText("Link to a project?").first()).toBeVisible({ timeout: 8_000 });
    const skipBtn = page.getByRole("button", { name: "Skip" }).first();
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
      await expect(input).toHaveValue("", { timeout: 8_000 });
    } else {
      await aiSubmit(page, "skip");
    }

    // Step 3 — type (choice chip): click chip, then submit
    await expect(page.getByText("What kind of document?").first()).toBeVisible({ timeout: 8_000 });
    await page.getByRole("button", { name: "Service agreement" }).click();
    await aiSubmit(page); // submits the chip value set by click

    // Step 4 — scope
    await expect(page.getByText(/scope.*deliverables/i).first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, "Landing page redesign for e-commerce brand, 4 pages, CMS setup, 3-week timeline");

    // Step 5 — commercials
    await expect(page.getByText(/Fees.*payment/i).first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, "INR 80000 fixed fee, 50% upfront, balance on delivery, 2 revision rounds, IP transfers on full payment");

    // Step 6 — clauses (optional)
    await expect(page.getByText(/special clauses/i).first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, "skip");

    // Wait for contract draft preview
    const result = await raceVisible(
      page,
      ["Contract ready", "Proposal ready", "Could not draft", "Choose a client first", "AI draft generation is temporarily unavailable"],
      60_000,
    );
    if (result.includes("Could not") || result.includes("unavailable") || result.includes("Choose a client")) {
      throw new Error(`Contract draft failed: "${result}"`);
    }

    await expect(page.getByText(/Contract ready|Proposal ready/i)).toBeVisible();
    await expect(page.getByText(/Scope of Work|Parties|Fees|Timeline/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("button", { name: /Approve.*Email/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /WhatsApp/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Open editor/i })).toBeVisible();
  });

  test("contract WhatsApp button opens a new tab", async ({ page, context }) => {
    test.setTimeout(120_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);
    await page.getByRole("button", { name: "Draft contract" }).click();

    const input = aiInput(page);

    await expect(page.getByText("Who is this contract or proposal for?").first()).toBeVisible({ timeout: 8_000 });
    const clientSelect = page.locator("select").first();
    if (await clientSelect.isVisible().catch(() => false)) {
      await clientSelect.selectOption({ label: CLIENT_NAME! }).catch(() => {});
    }
    await aiSubmit(page, CLIENT_NAME!);

    await expect(page.getByText("Link to a project?").first()).toBeVisible({ timeout: 8_000 });
    const skipBtn = page.getByRole("button", { name: "Skip" }).first();
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
      await expect(input).toHaveValue("", { timeout: 8_000 });
    } else {
      await aiSubmit(page, "skip");
    }

    await expect(page.getByText("What kind of document?").first()).toBeVisible({ timeout: 8_000 });
    await page.getByRole("button", { name: "Service agreement" }).click();
    await aiSubmit(page);

    await expect(page.getByText(/scope.*deliverables/i).first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, "Branding and design services, 6-week engagement");

    await expect(page.getByText(/Fees.*payment/i).first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, "INR 60000 total, 30 days net, 1 revision included");

    await expect(page.getByText(/special clauses/i).first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, "skip");

    await expect(page.getByText(/Contract ready|Proposal ready/i)).toBeVisible({ timeout: 60_000 });

    const [newPage] = await Promise.all([
      context.waitForEvent("page", { timeout: 15_000 }),
      page.getByRole("button", { name: /WhatsApp/i }).click(),
    ]);
    expect(newPage.url()).toMatch(/whatsapp\.com|wa\.me/);
  });
});
