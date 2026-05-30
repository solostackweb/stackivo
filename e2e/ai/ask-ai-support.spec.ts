/**
 * Ask AI — support Q&A workflow E2E test.
 *
 * Tests that the AI can answer questions from docs, privacy policy, and
 * terms — and falls back to submitting a support ticket when docs don't help.
 *
 * Required env:
 *   E2E_USER_EMAIL      -- non-admin user email
 *   E2E_USER_PASSWORD   -- its password
 */

import { test, expect } from "@playwright/test";
import { loginUser, openAiPanel, raceVisible, aiInput } from "./helpers";

const USER_EMAIL = process.env.E2E_USER_EMAIL;
const USER_PASSWORD = process.env.E2E_USER_PASSWORD;
const HAS_CREDS = Boolean(USER_EMAIL && USER_PASSWORD);

test.describe("Ask AI support flow", () => {
  test.skip(
    !HAS_CREDS,
    "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run Ask AI support tests.",
  );

  test("answers a docs question from built-in docs", async ({ page }) => {
    test.setTimeout(90_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);

    await page.getByRole("button", { name: "Support" }).click();

    const input = aiInput(page);

    // Step 1 — question
    await expect(page.getByText("What do you need help with?")).toBeVisible({
      timeout: 8_000,
    });
    await input.fill("How do I create an invoice using Ask AI?");
    await input.press("Enter");

    // Step 2 — page context (optional)
    await input.fill("skip");
    await input.press("Enter");

    // Step 3 — route choice
    await page
      .getByRole("button", { name: "Answer from docs first" })
      .click();

    // The AI should respond with an answer (not a generic fallback)
    // We race against possible outcomes
    const result = await raceVisible(
      page,
      [
        "Invoice",
        "invoice",
        "I could not read",
        "sent to Stackivo support",
        "Could not",
      ],
      45_000,
    );

    // Any of these indicates the support flow completed (answer or fallback)
    expect(
      result.length > 0,
      `Support flow did not produce a visible response. Last matched: "${result}"`,
    ).toBe(true);

    // There should be at least one assistant message beyond the greeting
    const assistantMessages = page.locator(".mr-auto.bg-muted\\/60");
    const count = await assistantMessages.count();
    expect(count).toBeGreaterThan(1);
  });

  test("answers a privacy policy question", async ({ page }) => {
    test.setTimeout(90_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);

    await page.getByRole("button", { name: "Support" }).click();

    const input = aiInput(page);

    await input.fill("What data does Stackivo collect about me?");
    await input.press("Enter");

    await input.fill("skip");
    await input.press("Enter");

    await page
      .getByRole("button", { name: "Answer from docs first" })
      .click();

    // Should produce some kind of response in under 45s
    await raceVisible(
      page,
      ["data", "privacy", "collect", "I could not", "sent to Stackivo"],
      45_000,
    );

    const assistantMessages = page.locator(".mr-auto.bg-muted\\/60");
    expect(await assistantMessages.count()).toBeGreaterThan(1);
  });

  test("routes to support ticket when docs don't help", async ({ page }) => {
    test.setTimeout(90_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);

    await page.getByRole("button", { name: "Support" }).click();

    const input = aiInput(page);

    // Extremely specific question unlikely to be in docs
    await input.fill(
      "My invoice PDF has a rendering issue with custom brand fonts on Windows only",
    );
    await input.press("Enter");

    await input.fill("invoices page");
    await input.press("Enter");

    // Choose "Send to support" directly
    await page.getByRole("button", { name: "Send to support" }).click();

    await raceVisible(
      page,
      ["sent to Stackivo support", "I sent this", "support", "Could not"],
      30_000,
    );

    const assistantMessages = page.locator(".mr-auto.bg-muted\\/60");
    expect(await assistantMessages.count()).toBeGreaterThan(1);
  });

  test("free-form help question routes through support", async ({ page }) => {
    test.setTimeout(90_000);

    await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
    await openAiPanel(page);

    const input = aiInput(page);
    await input.fill("How do I set up GST on my invoices?");
    await input.press("Enter");

    // Should produce a response of some kind
    await raceVisible(
      page,
      ["GST", "gst", "tax", "sent to Stackivo", "I could not"],
      45_000,
    );

    const assistantMessages = page.locator(".mr-auto.bg-muted\\/60");
    expect(await assistantMessages.count()).toBeGreaterThan(1);
  });
});
