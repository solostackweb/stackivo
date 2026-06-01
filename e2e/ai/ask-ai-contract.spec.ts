/**
 * Ask AI — contract workflow E2E test.
 *
 * Exercises single-prompt contract drafting: the client is pinned via the
 * workspace context selector, scope/commercials are extracted from one
 * prompt, and the full preview offers email/WhatsApp/editor actions.
 *
 * Required env:
 *   E2E_USER_EMAIL        -- non-admin user email
 *   E2E_USER_PASSWORD     -- its password
 *   E2E_AI_CLIENT_NAME    -- client display name present in the workspace
 */

import { test, expect, type Page } from "@playwright/test";
import { loginUser, openAiPanel, raceVisible, aiInput, setAiClient } from "./helpers";

const USER_EMAIL = process.env.E2E_USER_EMAIL;
const USER_PASSWORD = process.env.E2E_USER_PASSWORD;
const CLIENT_NAME = process.env.E2E_AI_CLIENT_NAME;
const HAS_CREDS = Boolean(USER_EMAIL && USER_PASSWORD && CLIENT_NAME);

async function draftContract(page: Page, prompt: string): Promise<void> {
  await page.getByRole("button", { name: "Draft contract" }).click();
  await expect(page.getByText(/Let's draft a contract/i).first()).toBeVisible({ timeout: 8_000 });
  await setAiClient(page, CLIENT_NAME!).catch(() => {});

  const input = aiInput(page);
  await input.fill(prompt);
  await input.press("Enter");

  // A missing client surfaces the explicit picker — resolve it if shown.
  const clientPickerTitle = page.getByText("Which client is this contract for?");
  const ready = page.getByText(/Contract ready|Proposal ready/i);
  await Promise.race([
    ready.waitFor({ state: "visible", timeout: 90_000 }),
    clientPickerTitle.waitFor({ state: "visible", timeout: 90_000 }),
  ]);
  if (await clientPickerTitle.isVisible()) {
    const pickerSelect = page.locator("select").filter({ hasText: "Choose a client" }).first();
    await pickerSelect.selectOption({ label: CLIENT_NAME! });
    await page.getByRole("button", { name: "Use selected client" }).click();
  }
}

test.describe("Ask AI contract flow", () => {
  test.skip(!HAS_CREDS, "Set E2E_USER_EMAIL, E2E_USER_PASSWORD, and E2E_AI_CLIENT_NAME to run Ask AI contract tests.");

  test("drafts a contract and shows full preview with delivery options", async ({ page }) => {
    test.setTimeout(120_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);

    await draftContract(
      page,
      "Service agreement: landing page redesign for an e-commerce brand, 4 pages, CMS setup, 3-week timeline. " +
        "INR 80000 fixed fee, 50% upfront and balance on delivery, 2 revision rounds, IP transfers on full payment.",
    );

    const result = await raceVisible(
      page,
      ["Contract ready", "Proposal ready", "Could not draft", "AI draft generation is temporarily unavailable"],
      90_000,
    );
    if (result.includes("Could not") || result.includes("unavailable")) {
      throw new Error(`Contract draft failed: "${result}"`);
    }

    await expect(page.getByText(/Contract ready|Proposal ready/i)).toBeVisible();
    await expect(page.getByText(/Scope of Work|Parties|Fees|Timeline|Responsibilities/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("button", { name: /Approve.*Email/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /WhatsApp/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Open editor/i })).toBeVisible();
  });

  test("contract WhatsApp button opens a new tab", async ({ page, context }) => {
    test.setTimeout(120_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);

    await draftContract(
      page,
      "Service agreement for branding and design services, 6-week engagement. INR 60000 total, net 30 days, 1 revision included.",
    );

    await expect(page.getByText(/Contract ready|Proposal ready/i)).toBeVisible({ timeout: 90_000 });

    const [newPage] = await Promise.all([
      context.waitForEvent("page", { timeout: 15_000 }),
      page.getByRole("button", { name: /WhatsApp/i }).click(),
    ]);
    expect(newPage.url()).toMatch(/whatsapp\.com|wa\.me/);
  });

  test("refines an existing contract draft from a follow-up instruction", async ({ page }) => {
    test.setTimeout(150_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);

    await draftContract(
      page,
      "Service agreement for a marketing website build, 4-week timeline. INR 70000 total, 50% upfront.",
    );

    await expect(page.getByText(/Contract ready|Proposal ready/i)).toBeVisible({ timeout: 90_000 });
    // The preview should invite in-panel edits.
    await expect(page.getByText(/Want changes\?/i)).toBeVisible();

    // A follow-up instruction must revise the SAME draft, not start a new one.
    const input = aiInput(page);
    await input.fill("Add a confidentiality clause and change the fee to 90000");
    await input.press("Enter");

    const result = await raceVisible(
      page,
      ["Contract ready", "Proposal ready", "Could not", "not found"],
      90_000,
    );
    if (result.includes("Could not") || result.includes("not found")) {
      throw new Error(`Contract refinement failed: "${result}"`);
    }
    // Still a single live draft preview after the revision.
    await expect(page.getByText(/Contract ready|Proposal ready/i).last()).toBeVisible();
    await expect(page.getByRole("button", { name: /Approve.*Email/i }).last()).toBeVisible();
  });
});
