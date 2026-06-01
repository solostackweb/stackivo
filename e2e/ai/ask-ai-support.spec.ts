/**
 * Ask AI — support Q&A workflow E2E test.
 *
 * The assistant answers from docs/privacy/terms in one shot and files a
 * support ticket when the docs do not cover the question. General-mode
 * questions are answered conversationally without a ticket.
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

function assistantMessages(page: import("@playwright/test").Page) {
  return page.locator(".mr-auto.bg-muted\\/60");
}

test.describe("Ask AI support flow", () => {
  test.skip(
    !HAS_CREDS,
    "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run Ask AI support tests.",
  );

  test("answers a docs question in one shot", async ({ page }) => {
    test.setTimeout(90_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);
    await page.getByRole("button", { name: "Support" }).click();

    await expect(page.getByText(/answer from docs|send this to support/i).first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, "How do I create an invoice using Ask AI?");

    const result = await raceVisible(
      page,
      ["invoice", "Invoice", "I could not read", "sent to Stackivo support", "Could not"],
      60_000,
    );
    expect(
      result.length > 0,
      `Support flow did not produce a visible response. Last matched: "${result}"`,
    ).toBe(true);
    expect(await assistantMessages(page).count()).toBeGreaterThan(1);
  });

  test("answers a privacy policy question", async ({ page }) => {
    test.setTimeout(90_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);
    await page.getByRole("button", { name: "Support" }).click();

    await expect(page.getByText(/answer from docs|send this to support/i).first()).toBeVisible({ timeout: 8_000 });
    await aiSubmit(page, "What data does Stackivo collect about me?");

    await raceVisible(page, ["data", "privacy", "collect", "I could not", "sent to Stackivo"], 60_000);
    expect(await assistantMessages(page).count()).toBeGreaterThan(1);
  });

  test("files a support ticket when docs don't help", async ({ page }) => {
    test.setTimeout(90_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);
    await page.getByRole("button", { name: "Support" }).click();

    await expect(page.getByText(/answer from docs|send this to support/i).first()).toBeVisible({ timeout: 8_000 });
    // Highly specific issue unlikely to be covered by docs → should fall back to a ticket.
    await aiSubmit(page, "My invoice PDF has a rendering issue with custom brand fonts on Windows only");

    await raceVisible(page, ["sent to Stackivo support", "I could not read", "support", "Could not"], 60_000);
    expect(await assistantMessages(page).count()).toBeGreaterThan(1);
  });

  test("free-form help question is answered in general mode", async ({ page }) => {
    test.setTimeout(90_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);

    await aiSubmit(page, "How do I set up GST on my invoices?");

    await raceVisible(page, ["GST", "gst", "tax", "sent to Stackivo", "I could not"], 60_000);
    expect(await assistantMessages(page).count()).toBeGreaterThan(1);
  });

  test("answers a meta question conversationally instead of a docs miss", async ({ page }) => {
    test.setTimeout(60_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);

    // A meta/greeting message must NOT trigger a "couldn't find it in docs" miss.
    await aiSubmit(page, "Can I ask you a question?");

    await expect(page.getByText(/go ahead and ask/i)).toBeVisible({ timeout: 15_000 });
  });

  test("greets the user conversationally in general mode", async ({ page }) => {
    test.setTimeout(60_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);

    await aiSubmit(page, "hi");

    await expect(page.getByText(/What would you like to do/i)).toBeVisible({ timeout: 15_000 });
  });
});
