# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ai\ask-ai-welcome-doc.spec.ts >> Ask AI welcome document flow >> welcome doc open editor button navigates to /dashboard/welcome
- Location: e2e\ai\ask-ai-welcome-doc.spec.ts:82:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Welcome document ready')
Expected: visible
Timeout: 60000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 60000ms
  - waiting for getByText('Welcome document ready')

```

```yaml
- img
- heading "Something went wrong" [level=2]
- paragraph: An unexpected error occurred. You can try again or head back to the dashboard.
- button "Try again"
- region "Notifications alt+T"
- alert: Dashboard · Stackivo
- dialog "Install Stackivo":
  - paragraph: Install Stackivo
  - text: Open your browser menu and choose
  - img
  - text: Install app
  - button "Dismiss install prompt":
    - img
- button "Open chat"
```

# Test source

```ts
  13  | const USER_EMAIL = process.env.E2E_USER_EMAIL;
  14  | const USER_PASSWORD = process.env.E2E_USER_PASSWORD;
  15  | const CLIENT_NAME = process.env.E2E_AI_CLIENT_NAME;
  16  | const HAS_CREDS = Boolean(USER_EMAIL && USER_PASSWORD && CLIENT_NAME);
  17  | 
  18  | test.describe("Ask AI welcome document flow", () => {
  19  |   test.skip(!HAS_CREDS, "Set E2E_USER_EMAIL, E2E_USER_PASSWORD, and E2E_AI_CLIENT_NAME to run Ask AI welcome doc tests.");
  20  | 
  21  |   test("drafts, approves, and shows delivery options for a welcome doc", async ({ page }) => {
  22  |     test.setTimeout(120_000);
  23  | 
  24  |     await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
  25  |     await openAiPanel(page);
  26  |     await page.getByRole("button", { name: "Welcome doc" }).click();
  27  | 
  28  |     const input = aiInput(page);
  29  | 
  30  |     // Step 1 — client (optional)
  31  |     await expect(page.getByText("Who is this welcome document for?").first()).toBeVisible({ timeout: 8_000 });
  32  |     const sel = page.locator("select").first();
  33  |     if (await sel.isVisible().catch(() => false)) {
  34  |       await sel.selectOption({ label: CLIENT_NAME! }).catch(() => {});
  35  |     }
  36  |     await aiSubmit(page, CLIENT_NAME!);
  37  | 
  38  |     // Step 2 — relationship (choice chip): click chip, then submit
  39  |     await expect(page.getByText("What kind of engagement?").first()).toBeVisible({ timeout: 8_000 });
  40  |     await page.getByRole("button", { name: "Design client" }).click();
  41  |     await aiSubmit(page); // submits chip value
  42  | 
  43  |     // Step 3 — process
  44  |     await expect(page.getByText(/process.*communication/i).first()).toBeVisible({ timeout: 8_000 });
  45  |     await aiSubmit(page, "Weekly Tuesday check-ins, feedback in one consolidated doc, client replies within 2 business days");
  46  | 
  47  |     // Step 4 — operations
  48  |     await expect(page.getByText(/payments.*files/i).first()).toBeVisible({ timeout: 8_000 });
  49  |     await aiSubmit(page, "Invoices due in 15 days via Stackivo, final files via portal, written approval required for milestones");
  50  | 
  51  |     // Step 5 — tone (choice chip): click chip, then submit
  52  |     await expect(page.getByText("Tone and style?").first()).toBeVisible({ timeout: 8_000 });
  53  |     await page.getByRole("button", { name: "Warm and premium" }).click();
  54  |     await aiSubmit(page); // submits chip value
  55  | 
  56  |     // Race: welcome doc preview vs error states
  57  |     const result = await raceVisible(
  58  |       page,
  59  |       ["Welcome document ready", "Could not draft", "AI draft generation is temporarily unavailable", "Tell me about the client"],
  60  |       60_000,
  61  |     );
  62  |     if (result.includes("Could not") || result.includes("unavailable")) {
  63  |       throw new Error(`Welcome doc draft failed: "${result}"`);
  64  |     }
  65  | 
  66  |     await expect(page.getByText("Welcome document ready")).toBeVisible();
  67  |     await expect(page.getByText(/How We Will Work|Communication|Payments|Next Steps/i).first()).toBeVisible({ timeout: 5_000 });
  68  | 
  69  |     // Approve and publish
  70  |     await page.getByRole("button", { name: /Approve.*publish/i }).click();
  71  | 
  72  |     const deliveryResult = await raceVisible(page, ["Welcome document published", "Could not", "Document not found"], 25_000);
  73  |     if (deliveryResult.includes("Could not") || deliveryResult.includes("not found")) {
  74  |       throw new Error(`Welcome doc approval failed: "${deliveryResult}"`);
  75  |     }
  76  | 
  77  |     await expect(page.getByText("Welcome document published")).toBeVisible();
  78  |     await expect(page.getByRole("button", { name: /Email/i })).toBeVisible();
  79  |     await expect(page.getByRole("button", { name: /WhatsApp/i })).toBeVisible();
  80  |   });
  81  | 
  82  |   test("welcome doc open editor button navigates to /dashboard/welcome", async ({ page }) => {
  83  |     test.setTimeout(120_000);
  84  | 
  85  |     await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
  86  |     await openAiPanel(page);
  87  |     await page.getByRole("button", { name: "Welcome doc" }).click();
  88  | 
  89  |     const input = aiInput(page);
  90  | 
  91  |     // Step 1 — client
  92  |     await expect(page.getByText("Who is this welcome document for?").first()).toBeVisible({ timeout: 8_000 });
  93  |     await aiSubmit(page, CLIENT_NAME!);
  94  | 
  95  |     // Step 2 — relationship (choice chip)
  96  |     await expect(page.getByText("What kind of engagement?").first()).toBeVisible({ timeout: 8_000 });
  97  |     await page.getByRole("button", { name: "Design client" }).click();
  98  |     await aiSubmit(page);
  99  | 
  100 |     // Step 3 — process
  101 |     await expect(page.getByText(/process.*communication/i).first()).toBeVisible({ timeout: 8_000 });
  102 |     await aiSubmit(page, "Bi-weekly updates, feedback via email");
  103 | 
  104 |     // Step 4 — operations
  105 |     await expect(page.getByText(/payments.*files/i).first()).toBeVisible({ timeout: 8_000 });
  106 |     await aiSubmit(page, "Invoices due in 30 days");
  107 | 
  108 |     // Step 5 — tone (choice chip)
  109 |     await expect(page.getByText("Tone and style?").first()).toBeVisible({ timeout: 8_000 });
  110 |     await page.getByRole("button", { name: "Direct and concise" }).click();
  111 |     await aiSubmit(page);
  112 | 
> 113 |     await expect(page.getByText("Welcome document ready")).toBeVisible({ timeout: 60_000 });
      |                                                            ^ Error: expect(locator).toBeVisible() failed
  114 |     await page.getByRole("button", { name: "Open editor" }).click();
  115 |     await page.waitForURL((url) => url.pathname.startsWith("/dashboard/welcome"), { timeout: 10_000 });
  116 |   });
  117 | });
  118 | 
```