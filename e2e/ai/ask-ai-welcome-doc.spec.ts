/**
 * Ask AI — welcome document workflow E2E test.
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

test.describe("Ask AI welcome document flow", () => {
  test.skip(!HAS_CREDS, "Set E2E_USER_EMAIL, E2E_USER_PASSWORD, and E2E_AI_CLIENT_NAME to run Ask AI welcome doc tests.");

  test("drafts, approves, and shows delivery options for a welcome doc", async ({ page }) => {
    test.setTimeout(120_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);
    await page.getByRole("button", { name: "Welcome doc" }).click();

    const input = aiInput(page);

    // Step 1 — client (optional)
    await expect(page.getByText("Who is this welcome document for?").first()).toBeVisible({ timeout: 8_000 });
    const sel = page.locator("select").first();
    if (await sel.isVisible().catch(() => false)) {
      await sel.selectOption({ label: CLIENT_NAME! }).catch(() => {});
    }
    await aiSubmit(page, CLIENT_NAME!);

    // Step 2 — relationship (choice chip): click chip, then submit
    await expect(page.getByText("What kind of engagement?").first()).toBeVisible({ timeout: 8_000 });
    await page.getByRole("button", { name: "Design client" }).click();
    await aiSubmit(page); // submits chip value

    // Step 3 — process
    await expect(page.getByText(/process.*communication/i).first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, "Weekly Tuesday check-ins, feedback in one consolidated doc, client replies within 2 business days");

    // Step 4 — operations
    await expect(page.getByText(/payments.*files/i).first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, "Invoices due in 15 days via Stackivo, final files via portal, written approval required for milestones");

    // Step 5 — tone (choice chip): click chip, then submit
    await expect(page.getByText("Tone and style?").first()).toBeVisible({ timeout: 8_000 });
    await page.getByRole("button", { name: "Warm and premium" }).click();
    await aiSubmit(page); // submits chip value

    // Race: welcome doc preview vs error states
    const result = await raceVisible(
      page,
      ["Welcome document ready", "Could not draft", "AI draft generation is temporarily unavailable", "Tell me about the client"],
      60_000,
    );
    if (result.includes("Could not") || result.includes("unavailable")) {
      throw new Error(`Welcome doc draft failed: "${result}"`);
    }

    await expect(page.getByText("Welcome document ready")).toBeVisible();
    await expect(page.getByText(/How We Will Work|Communication|Payments|Next Steps/i).first()).toBeVisible({ timeout: 5_000 });

    // Approve and publish
    await page.getByRole("button", { name: /Approve.*publish/i }).click();

    const deliveryResult = await raceVisible(page, ["Welcome document published", "Could not", "Document not found"], 25_000);
    if (deliveryResult.includes("Could not") || deliveryResult.includes("not found")) {
      throw new Error(`Welcome doc approval failed: "${deliveryResult}"`);
    }

    await expect(page.getByText("Welcome document published")).toBeVisible();
    await expect(page.getByRole("button", { name: /Email/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /WhatsApp/i })).toBeVisible();
  });

  test("welcome doc open editor button navigates to /dashboard/welcome", async ({ page }) => {
    test.setTimeout(120_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);
    await page.getByRole("button", { name: "Welcome doc" }).click();

    const input = aiInput(page);

    // Step 1 — client
    await expect(page.getByText("Who is this welcome document for?").first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, CLIENT_NAME!);

    // Step 2 — relationship (choice chip)
    await expect(page.getByText("What kind of engagement?").first()).toBeVisible({ timeout: 8_000 });
    await page.getByRole("button", { name: "Design client" }).click();
    await aiSubmit(page);

    // Step 3 — process
    await expect(page.getByText(/process.*communication/i).first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, "Bi-weekly updates, feedback via email");

    // Step 4 — operations
    await expect(page.getByText(/payments.*files/i).first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, "Invoices due in 30 days");

    // Step 5 — tone (choice chip)
    await expect(page.getByText("Tone and style?").first()).toBeVisible({ timeout: 8_000 });
    await page.getByRole("button", { name: "Direct and concise" }).click();
    await aiSubmit(page);

    await expect(page.getByText("Welcome document ready")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Open editor" }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/dashboard/welcome"), { timeout: 10_000 });
  });
});
