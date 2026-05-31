/**
 * Ask AI — welcome document workflow E2E test.
 *
 * Exercises single-prompt welcome-doc drafting (client pinned via context
 * selector), the full preview, and approve → deliver.
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

const WELCOME_PROMPT =
  "Welcome doc for a design client. Weekly Tuesday check-ins, feedback consolidated in one doc, " +
  "client replies within 2 business days. Invoices due in 15 days via Stackivo, final files via portal, " +
  "written approval required for milestones. Warm and premium tone.";

async function draftWelcomeDoc(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Welcome doc" }).click();
  await expect(page.getByText(/Let's prepare a welcome document/i).first()).toBeVisible({ timeout: 8_000 });
  await setAiClient(page, CLIENT_NAME!).catch(() => {});

  const input = aiInput(page);
  await input.fill(WELCOME_PROMPT);
  await input.press("Enter");
}

test.describe("Ask AI welcome document flow", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!HAS_CREDS, "Set E2E_USER_EMAIL, E2E_USER_PASSWORD, and E2E_AI_CLIENT_NAME to run Ask AI welcome doc tests.");

  test("drafts, approves, and shows delivery options for a welcome doc", async ({ page }) => {
    test.setTimeout(120_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);
    await draftWelcomeDoc(page);

    const result = await raceVisible(
      page,
      ["Welcome document ready", "Could not draft", "AI draft generation is temporarily unavailable"],
      90_000,
    );
    if (result.includes("Could not") || result.includes("unavailable")) {
      throw new Error(`Welcome doc draft failed: "${result}"`);
    }

    await expect(page.getByText("Welcome document ready")).toBeVisible();
    await expect(page.getByText(/How We Will Work|Communication|Payments|Next Steps|Working/i).first()).toBeVisible({ timeout: 5_000 });

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
    await draftWelcomeDoc(page);

    await expect(page.getByText("Welcome document ready")).toBeVisible({ timeout: 90_000 });
    await page.getByRole("button", { name: "Open editor" }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/dashboard/welcome"), { timeout: 25_000 });
  });
});
