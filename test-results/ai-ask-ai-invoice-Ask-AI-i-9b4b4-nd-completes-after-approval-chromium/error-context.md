# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ai\ask-ai-invoice.spec.ts >> Ask AI invoice flow >> invoice email send completes after approval
- Location: e2e\ai\ask-ai-invoice.spec.ts:114:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Draft invoice ready for approval')
Expected: visible
Timeout: 60000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 60000ms
  - waiting for getByText('Draft invoice ready for approval')

```

```yaml
- complementary:
  - link "Stackivo home":
    - /url: /dashboard
    - text: Stackivo
  - paragraph: Workspace
  - navigation:
    - link "Dashboard":
      - /url: /dashboard
      - img
      - text: Dashboard
    - link "Clients":
      - /url: /dashboard/clients
      - img
      - text: Clients
    - link "Projects":
      - /url: /dashboard/projects
      - img
      - text: Projects
    - link "Invoices":
      - /url: /dashboard/invoices
      - img
      - text: Invoices
    - link "Contracts":
      - /url: /dashboard/contracts
      - img
      - text: Contracts
    - link "Welcome Docs":
      - /url: /dashboard/welcome
      - img
      - text: Welcome Docs
    - link "Portal Pro":
      - /url: /dashboard/portal
      - img
      - text: Portal Pro
    - link "Time":
      - /url: /dashboard/time
      - img
      - text: Time
    - link "Pulse Pro":
      - /url: /dashboard/pulse
      - img
      - text: Pulse Pro
  - paragraph: Account
  - navigation:
    - link "Settings":
      - /url: /dashboard/settings
      - img
      - text: Settings
    - link "Help & support":
      - /url: /help
      - img
      - text: Help & support
  - link "Akshat Jain free plan":
    - /url: /dashboard/settings/company
    - paragraph: Akshat Jain
    - paragraph: free plan
  - button "Collapse sidebar":
    - img
- banner:
  - navigation "Breadcrumb":
    - list:
      - listitem: Dashboard
  - button "Open command palette": Search or jump to… ⌘ K
  - button "Notifications, 2 unread":
    - img
  - button "Toggle theme":
    - img
    - img
    - text: Toggle theme
  - button "AJ"
- main:
  - heading "Welcome back, Akshat" [level=1]
  - paragraph: Here's what's happening with your business today.
  - link "New invoice":
    - /url: /dashboard/invoices/new
    - img
    - text: New invoice
  - status:
    - text: 1 client slot remaining on your free plan.
    - link "Upgrade to Pro for unlimited clients":
      - /url: /dashboard/settings/billing
      - text: Upgrade to Pro for unlimited clients
      - img
    - button "Dismiss upgrade banner":
      - img
  - button "Dismiss setup checklist":
    - img
  - text: Finish setting up 1 / 2
  - heading "One more thing and you're fully set up." [level=3]
  - list:
    - listitem:
      - link "Set your invoice defaults Prefix, default due days, and footer notes used on every invoice you send.":
        - /url: /dashboard/settings/invoice
        - img
        - paragraph: Set your invoice defaults
        - paragraph: Prefix, default due days, and footer notes used on every invoice you send.
        - img
    - listitem:
      - link "Add your signature Draw, type, or upload. It appears on every PDF and contract." [disabled]:
        - /url: /dashboard/settings/profile#signature
        - img
        - paragraph: Add your signature
        - paragraph: Draw, type, or upload. It appears on every PDF and contract.
  - text: Business overview Issued invoices are receivables, not revenue — cash collected is what actually moved into your bank.
  - paragraph: Collected
  - paragraph: ₹0
  - paragraph: Paid invoices · all time
  - img
  - paragraph: Outstanding
  - paragraph: ₹2.8L
  - paragraph: Issued but unpaid
  - img
  - paragraph: Overdue
  - paragraph: ₹0
  - paragraph: 0% of outstanding
  - img
  - paragraph: Active projects
  - paragraph: "0"
  - paragraph: Currently in flight
  - img
  - paragraph: This week
  - paragraph: 0h
  - paragraph: No time logged yet
  - img
  - text: Revenue overview Paid invoice revenue over the last 6 months ₹0 Paid
  - paragraph: No revenue yet
  - paragraph: Create paid invoices to see your revenue trend here.
  - text: Recent invoices Latest activity across your invoices
  - link "View all →":
    - /url: /dashboard/invoices
  - table:
    - rowgroup:
      - row "Invoice Client Amount Status Date":
        - columnheader "Invoice"
        - columnheader "Client"
        - columnheader "Amount"
        - columnheader "Status"
        - columnheader "Date"
    - rowgroup:
      - row "INV-0010 AE Acme Encore ₹50,000 Sent 30 May 2026":
        - cell "INV-0010":
          - link "INV-0010":
            - /url: /dashboard/invoices/7516f38c-ca06-4fe2-b9a8-789d4e957793
        - cell "AE Acme Encore":
          - link "AE Acme Encore":
            - /url: /dashboard/invoices/7516f38c-ca06-4fe2-b9a8-789d4e957793
        - cell "₹50,000"
        - cell "Sent"
        - cell "30 May 2026"
      - row "INV-0009 AE Acme Encore ₹15,000 Sent 30 May 2026":
        - cell "INV-0009":
          - link "INV-0009":
            - /url: /dashboard/invoices/80124be8-f5d0-4c3f-aa34-4cc1cae288e0
        - cell "AE Acme Encore":
          - link "AE Acme Encore":
            - /url: /dashboard/invoices/80124be8-f5d0-4c3f-aa34-4cc1cae288e0
        - cell "₹15,000"
        - cell "Sent"
        - cell "30 May 2026"
      - row "INV-0008 AE Acme Encore ₹25,000 Sent 30 May 2026":
        - cell "INV-0008":
          - link "INV-0008":
            - /url: /dashboard/invoices/3234ded3-3e1d-4c2f-a4df-11cc7137ca10
        - cell "AE Acme Encore":
          - link "AE Acme Encore":
            - /url: /dashboard/invoices/3234ded3-3e1d-4c2f-a4df-11cc7137ca10
        - cell "₹25,000"
        - cell "Sent"
        - cell "30 May 2026"
      - row "INV-0007 AE Acme Encore ₹50,000 Sent 30 May 2026":
        - cell "INV-0007":
          - link "INV-0007":
            - /url: /dashboard/invoices/ed1c1777-78f5-43d4-ab23-a942c771b8d2
        - cell "AE Acme Encore":
          - link "AE Acme Encore":
            - /url: /dashboard/invoices/ed1c1777-78f5-43d4-ab23-a942c771b8d2
        - cell "₹50,000"
        - cell "Sent"
        - cell "30 May 2026"
      - row "INV-0006 AE Acme Encore ₹15,000 Sent 30 May 2026":
        - cell "INV-0006":
          - link "INV-0006":
            - /url: /dashboard/invoices/c3d42fea-9bd2-4f35-9818-1b37999c3c1f
        - cell "AE Acme Encore":
          - link "AE Acme Encore":
            - /url: /dashboard/invoices/c3d42fea-9bd2-4f35-9818-1b37999c3c1f
        - cell "₹15,000"
        - cell "Sent"
        - cell "30 May 2026"
  - text: Activity What's happening in your workspace
  - list:
    - listitem:
      - img
      - paragraph: Invoice marked sent
      - paragraph: Just now
    - listitem:
      - img
      - paragraph: Created invoice INV-0010
      - paragraph: Just now
    - listitem:
      - img
      - paragraph: "Created contract: Acme Encore Branding and Design Service Agreement"
      - paragraph: Just now
    - listitem:
      - img
      - paragraph: "Created contract: Acme Encore Landing Page Redesign and CMS Setup Agreement"
      - paragraph: Just now
    - listitem:
      - img
      - paragraph: Created project Create a new project called "Branding Refresh 65189", active status, 4-week timeline
      - paragraph: 10m ago
    - listitem:
      - img
      - paragraph: Invoice INV-0009 sent to j.akshat296@gmail.com
      - paragraph: 10m ago
    - listitem:
      - img
      - paragraph: Invoice marked sent
      - paragraph: 11m ago
    - listitem:
      - img
      - paragraph: Created invoice INV-0009
      - paragraph: 11m ago
    - listitem:
      - img
      - paragraph: Invoice marked sent
      - paragraph: 11m ago
    - listitem:
      - img
      - paragraph: Created invoice INV-0008
      - paragraph: 11m ago
  - text: Recent clients Latest additions to your roster
  - link "View all →":
    - /url: /dashboard/clients
  - list:
    - listitem:
      - link "AD Add a new client called FreeForm Client 44039, email ff44039@example.com, based in Delhi No email":
        - /url: /dashboard/clients/d93809b2-5a70-4168-a5a2-ffad5aa39366
        - text: AD
        - paragraph: Add a new client called FreeForm Client 44039, email ff44039@example.com, based in Delhi
        - paragraph: No email
    - listitem:
      - link "CN Client or contact name? No email":
        - /url: /dashboard/clients/2a218dd2-eb8b-4fa3-8f1c-dff1c49d6979
        - text: CN
        - paragraph: Client or contact name?
        - paragraph: No email
    - listitem:
      - link "AD Add a new client called FreeForm Client 12038, email ff12038@example.com, based in Delhi No email":
        - /url: /dashboard/clients/7ef88c97-3091-43d5-9c86-1b4857a4c191
        - text: AD
        - paragraph: Add a new client called FreeForm Client 12038, email ff12038@example.com, based in Delhi
        - paragraph: No email
    - listitem:
      - link "AE Acme Encore j.akshat296@gmail.com":
        - /url: /dashboard/clients/8cc212f3-a978-47cf-bad9-0f168b4d3ac1
        - text: AE
        - paragraph: Acme Encore
        - paragraph: j.akshat296@gmail.com
  - text: Quick actions One-click shortcuts
  - list:
    - listitem:
      - link "Create invoice Bill a client":
        - /url: /dashboard/invoices/new
        - img
        - paragraph: Create invoice
        - paragraph: Bill a client
        - img
    - listitem:
      - link "Add client New contact":
        - /url: /dashboard/clients
        - img
        - paragraph: Add client
        - paragraph: New contact
        - img
    - listitem:
      - link "Log time Track an entry":
        - /url: /dashboard/time
        - img
        - paragraph: Log time
        - paragraph: Track an entry
        - img
    - listitem:
      - link "Send reminder Nudge a payer":
        - /url: /dashboard/invoices
        - img
        - paragraph: Send reminder
        - paragraph: Nudge a payer
        - img
  - button "Refer a freelancer Both get 1 month Pro free":
    - img
    - paragraph: Refer a freelancer
    - paragraph: Both get 1 month Pro free
    - img
  - text: Upcoming reminders Scheduled tasks & nudges
  - link "Manage →":
    - /url: /dashboard/invoices
  - img
  - heading "Nothing on the radar" [level=3]
  - paragraph: Reminders for overdue invoices and expiring contracts will appear here.
- region "Notifications alt+T"
- alert: Dashboard · Stackivo
- dialog "Install Stackivo":
  - paragraph: Install Stackivo
  - text: Open your browser menu and choose
  - img
  - text: Install app
  - button "Dismiss install prompt":
    - img
- img
- text: Ask AI
- button "← Back"
- button "Expand":
  - img
- button "Close":
  - img
- combobox:
  - option "No client" [selected]
  - option "Add a new client called FreeForm Client 44039, email ff44039@example.com, based in Delhi"
  - option "Client or contact name?"
  - option "Add a new client called FreeForm Client 12038, email ff12038@example.com, based in Delhi"
  - option "Acme Encore"
- combobox:
  - option "No project" [selected]
  - option "Create a new project called \"Branding Refresh 65189\", active status, 4-week timeline"
  - option "Create a new project called \"Branding Refresh 34228\", active status, 4-week timeline"
- text: Good to see you. Tell me what you want to do, or pick a workflow. I can create invoices, contracts, welcome docs, clients, projects, log time, and answer support questions. Let's create an invoice. Describe the client, work, amount, and due date. Tell me the client, work, amount, due date, and any discount — I'll fill the rest. Invoice Acme Encore 15000 for content writing, due in 10 days duplicate key value violates unique constraint "invoices_user_id_invoice_number_key"
- textbox "Type your answer…"
- button "Send" [disabled]:
  - img
- paragraph: Powered by Qwen · Stackivo AI
```

# Test source

```ts
  26  | 
  27  |     await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
  28  |     await openAiPanel(page);
  29  | 
  30  |     await expect(page.getByRole("button", { name: "Create invoice" })).toBeVisible();
  31  |     await page.getByRole("button", { name: "Create invoice" }).click();
  32  | 
  33  |     const promptInput = aiInput(page);
  34  |     await expect(promptInput).toBeVisible();
  35  |     await promptInput.fill(
  36  |       `Invoice ${CLIENT_NAME} 50000 for landing page design, due in 15 days`,
  37  |     );
  38  |     await promptInput.press("Enter");
  39  | 
  40  |     const draftHeading = page.getByText("Draft invoice ready for approval");
  41  |     const clientPickerTitle = page.getByText("Which client is this invoice for?");
  42  |     const missingAmount = page.getByText(/Add an invoice amount/i);
  43  |     const schemaCacheError = page.getByText(/discount_amount.+schema cache/i);
  44  |     const aiUnavailable = page.getByText(/AI draft generation is temporarily unavailable/i);
  45  |     const genericFailure = page.getByText(/Could not create invoice/i);
  46  | 
  47  |     await Promise.race([
  48  |       draftHeading.waitFor({ state: "visible", timeout: 60_000 }),
  49  |       clientPickerTitle.waitFor({ state: "visible", timeout: 60_000 }),
  50  |       missingAmount.waitFor({ state: "visible", timeout: 60_000 }),
  51  |       schemaCacheError.waitFor({ state: "visible", timeout: 60_000 }),
  52  |       aiUnavailable.waitFor({ state: "visible", timeout: 60_000 }),
  53  |       genericFailure.waitFor({ state: "visible", timeout: 60_000 }),
  54  |     ]);
  55  | 
  56  |     if (await clientPickerTitle.isVisible()) {
  57  |       const pickerSelect = page.locator("select").filter({ hasText: "Choose a client" }).first();
  58  |       await expect(pickerSelect).toBeVisible();
  59  |       await pickerSelect.selectOption({ label: CLIENT_NAME! });
  60  |       await page.getByRole("button", { name: "Use selected client" }).click();
  61  |       await expect(draftHeading).toBeVisible({ timeout: 30_000 });
  62  |     }
  63  | 
  64  |     if (await schemaCacheError.isVisible()) {
  65  |       throw new Error("Supabase schema cache is missing discount_amount. Run supabase db reset or ensure migrations are applied.");
  66  |     }
  67  |     if (await aiUnavailable.isVisible()) throw new Error("AI draft generation is temporarily unavailable.");
  68  |     if (await genericFailure.isVisible()) throw new Error("Ask AI could not create the invoice draft.");
  69  |     if (await missingAmount.isVisible()) throw new Error("Ask AI invoice prompt did not include a recognizable amount.");
  70  | 
  71  |     await expect(page.getByRole("button", { name: "Approve invoice" })).toBeVisible();
  72  |     await page.getByRole("button", { name: "Approve invoice" }).click();
  73  | 
  74  |     const approveSuccess = page.getByText("Invoice approved");
  75  |     const approveError = page.getByText(/could not approve|approval failed/i);
  76  |     await Promise.race([
  77  |       approveSuccess.waitFor({ state: "visible", timeout: 25_000 }),
  78  |       approveError.waitFor({ state: "visible", timeout: 25_000 }),
  79  |     ]);
  80  |     if ((await approveError.isVisible()) && !(await approveSuccess.isVisible())) {
  81  |       throw new Error(`Invoice approval failed: ${await approveError.textContent()}`);
  82  |     }
  83  |     await expect(approveSuccess).toBeVisible({ timeout: 5_000 });
  84  | 
  85  |     await expect(page.getByRole("button", { name: "Email" })).toBeVisible();
  86  |     await expect(page.getByRole("button", { name: "WhatsApp" })).toBeVisible();
  87  |   });
  88  | 
  89  |   test("invoice WhatsApp button opens WhatsApp in a new tab", async ({ page, context }) => {
  90  |     test.setTimeout(120_000);
  91  | 
  92  |     await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
  93  |     await openAiPanel(page);
  94  | 
  95  |     await page.getByRole("button", { name: "Create invoice" }).click();
  96  | 
  97  |     const promptInput = aiInput(page);
  98  |     await expect(promptInput).toBeVisible();
  99  |     await promptInput.fill(`Invoice ${CLIENT_NAME} 25000 for branding design, due in 7 days`);
  100 |     await promptInput.press("Enter");
  101 | 
  102 |     await expect(page.getByText("Draft invoice ready for approval")).toBeVisible({ timeout: 60_000 });
  103 |     await page.getByRole("button", { name: "Approve invoice" }).click();
  104 |     await expect(page.getByText("Invoice approved")).toBeVisible({ timeout: 25_000 });
  105 | 
  106 |     const [newPage] = await Promise.all([
  107 |       context.waitForEvent("page", { timeout: 15_000 }),
  108 |       page.getByRole("button", { name: "WhatsApp" }).click(),
  109 |     ]);
  110 |     // Accept both wa.me and api.whatsapp.com URL formats
  111 |     expect(newPage.url()).toMatch(/whatsapp\.com|wa\.me/);
  112 |   });
  113 | 
  114 |   test("invoice email send completes after approval", async ({ page }) => {
  115 |     test.setTimeout(120_000);
  116 | 
  117 |     await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
  118 |     await openAiPanel(page);
  119 | 
  120 |     await page.getByRole("button", { name: "Create invoice" }).click();
  121 | 
  122 |     const promptInput = aiInput(page);
  123 |     await promptInput.fill(`Invoice ${CLIENT_NAME} 15000 for content writing, due in 10 days`);
  124 |     await promptInput.press("Enter");
  125 | 
> 126 |     await expect(page.getByText("Draft invoice ready for approval")).toBeVisible({ timeout: 60_000 });
      |                                                                      ^ Error: expect(locator).toBeVisible() failed
  127 |     await page.getByRole("button", { name: "Approve invoice" }).click();
  128 |     await expect(page.getByText("Invoice approved")).toBeVisible({ timeout: 25_000 });
  129 | 
  130 |     await page.getByRole("button", { name: "Email" }).click();
  131 | 
  132 |     await expect(page.getByText(/Done\.|emailed|invoice sent/i)).toBeVisible({ timeout: 20_000 });
  133 |   });
  134 | });
  135 | 
```