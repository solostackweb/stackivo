/**
 * Shared helpers for Ask AI E2E tests.
 */

import { type Page, expect } from "@playwright/test";

export async function loginUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: /^Log in$/i }).click();
  await page.waitForURL(
    (url) =>
      url.pathname.startsWith("/dashboard") ||
      url.pathname.startsWith("/admin"),
    { timeout: 45_000 },
  );
}

export async function openAiPanel(page: Page): Promise<void> {
  const trigger = page.getByRole("button", { name: /Ask AI/i });
  await expect(trigger).toBeVisible({ timeout: 10_000 });
  await trigger.click();
  // Panel open — greeting message should appear
  await expect(
    page.getByText(/Good to see you|Tell me what you want/i).first(),
  ).toBeVisible({ timeout: 8_000 });
}

/**
 * Returns the AI chat input textarea.
 * Uses data-testid so it matches regardless of the current step's placeholder.
 */
export function aiInput(page: Page) {
  return page.getByTestId("ai-chat-input");
}

/**
 * Fill the AI chat input with text, submit it, and wait for the input to
 * clear — which confirms handleSubmit actually ran (it calls setInput("") at
 * the top) and prevents the next fill from racing against a pending transition.
 *
 * Also works after clicking a choice chip: the chip sets the input value,
 * then calling aiSubmit(page) with no text submits whatever the chip set.
 * Example:
 *   await chip.click();
 *   await aiSubmit(page);   // submits chip value, waits for clear
 */
export async function aiSubmit(
  page: Page,
  text?: string,
): Promise<void> {
  const input = aiInput(page);
  if (text !== undefined) await input.fill(text);
  await input.press("Enter");
  // Wait for the input to be cleared — confirms the submission was accepted
  // (handleSubmit bails early if pending=true or input is empty, so this
  // is a reliable signal that the step advanced).
  await expect(input).toHaveValue("", { timeout: 8_000 });
}

/**
 * Set the client context selector inside the open AI panel.
 * Pass the visible client name exactly as it appears in the select option.
 */
export async function setAiClient(
  page: Page,
  clientName: string,
): Promise<void> {
  const selects = page.locator(
    '.fixed select, [style*="--stackivo-ai-width"] select',
  );
  await selects.first().selectOption({ label: clientName });
}

/**
 * Wait for any of several locators to become visible, racing them.
 * Returns the text of the first visible one.
 */
export async function raceVisible(
  page: Page,
  texts: string[],
  timeout = 60_000,
): Promise<string> {
  // Use .first() on each locator to avoid strict-mode errors when a search
  // term (e.g. "invoice") appears in multiple elements on the page.
  const locators = texts.map((t) => page.getByText(t).first());
  await Promise.race(
    locators.map((l) => l.waitFor({ state: "visible", timeout })),
  );
  for (const [i, loc] of locators.entries()) {
    if (await loc.isVisible()) return texts[i];
  }
  return "";
}
