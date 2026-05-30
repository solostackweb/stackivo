# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ai\ask-ai-client.spec.ts >> Ask AI client flow >> creates a client record from chat
- Location: e2e\ai\ask-ai-client.spec.ts:22:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - link "Stackivo home" [ref=e5] [cursor=pointer]:
        - /url: /dashboard
        - img [ref=e7]
        - generic [ref=e10]: Stackivo
      - generic [ref=e11]:
        - paragraph [ref=e12]: Workspace
        - navigation [ref=e13]:
          - link "Dashboard" [ref=e14] [cursor=pointer]:
            - /url: /dashboard
            - img [ref=e16]
            - generic [ref=e21]: Dashboard
          - link "Clients" [ref=e22] [cursor=pointer]:
            - /url: /dashboard/clients
            - img [ref=e23]
            - generic [ref=e28]: Clients
          - link "Projects" [ref=e29] [cursor=pointer]:
            - /url: /dashboard/projects
            - img [ref=e30]
            - generic [ref=e32]: Projects
          - link "Invoices" [ref=e33] [cursor=pointer]:
            - /url: /dashboard/invoices
            - img [ref=e34]
            - generic [ref=e37]: Invoices
          - link "Contracts" [ref=e38] [cursor=pointer]:
            - /url: /dashboard/contracts
            - img [ref=e39]
            - generic [ref=e42]: Contracts
          - link "Welcome Docs" [ref=e43] [cursor=pointer]:
            - /url: /dashboard/welcome
            - img [ref=e44]
            - generic [ref=e46]: Welcome Docs
          - link "Portal Pro" [ref=e47] [cursor=pointer]:
            - /url: /dashboard/portal
            - img [ref=e48]
            - generic [ref=e54]: Portal
            - generic [ref=e56]:
              - img [ref=e57]
              - text: Pro
          - link "Time" [ref=e59] [cursor=pointer]:
            - /url: /dashboard/time
            - img [ref=e60]
            - generic [ref=e63]: Time
          - link "Pulse Pro" [ref=e64] [cursor=pointer]:
            - /url: /dashboard/pulse
            - img [ref=e65]
            - generic [ref=e67]: Pulse
            - generic [ref=e69]:
              - img [ref=e70]
              - text: Pro
      - generic [ref=e72]:
        - paragraph [ref=e73]: Account
        - navigation [ref=e74]:
          - link "Settings" [ref=e75] [cursor=pointer]:
            - /url: /dashboard/settings
            - img [ref=e76]
            - generic [ref=e79]: Settings
          - link "Help & support" [ref=e80] [cursor=pointer]:
            - /url: /help
            - img [ref=e81]
            - generic [ref=e88]: Help & support
      - link "Akshat Jain free plan" [ref=e90] [cursor=pointer]:
        - /url: /dashboard/settings/company
        - generic [ref=e91]: AJ
        - generic [ref=e92]:
          - paragraph [ref=e93]: Akshat Jain
          - paragraph [ref=e94]: free plan
      - button "Collapse sidebar" [ref=e96] [cursor=pointer]:
        - img
    - generic [ref=e97]:
      - banner [ref=e98]:
        - navigation "Breadcrumb" [ref=e100]:
          - list [ref=e101]:
            - listitem [ref=e102]:
              - generic [ref=e103]: Dashboard
        - button "Open command palette" [ref=e105] [cursor=pointer]:
          - img [ref=e106]
          - generic [ref=e109]: Search or jump to…
          - generic:
            - generic: ⌘
            - text: K
        - generic [ref=e110]:
          - button "Notifications, 2 unread" [ref=e111] [cursor=pointer]:
            - img
          - button "Toggle theme" [ref=e116] [cursor=pointer]:
            - img
            - img
            - generic [ref=e117]: Toggle theme
          - button "AJ" [ref=e118] [cursor=pointer]:
            - generic [ref=e120]: AJ
      - main [ref=e121]:
        - generic [ref=e123]:
          - generic [ref=e124]:
            - generic [ref=e125]:
              - heading "Welcome back, Akshat" [level=1] [ref=e126]
              - paragraph [ref=e127]: Here's what's happening with your business today.
            - link "New invoice" [ref=e129] [cursor=pointer]:
              - /url: /dashboard/invoices/new
              - img
              - text: New invoice
          - status [ref=e130]:
            - generic [ref=e131]:
              - img [ref=e132]
              - generic [ref=e134]:
                - text: You're on the free plan — 3 of 5 client slots remaining.
                - link "Upgrade to Pro for unlimited clients" [ref=e135] [cursor=pointer]:
                  - /url: /dashboard/settings/billing
                  - text: Upgrade to Pro for unlimited clients
                  - img [ref=e136]
            - button "Dismiss upgrade banner" [ref=e138] [cursor=pointer]:
              - img [ref=e139]
          - generic [ref=e143]:
            - button "Dismiss setup checklist" [ref=e144] [cursor=pointer]:
              - img [ref=e145]
            - generic [ref=e148]:
              - generic [ref=e149]:
                - generic [ref=e150]: Finish setting up
                - generic [ref=e151]: 1 / 2
              - heading "One more thing and you're fully set up." [level=3] [ref=e152]
              - list [ref=e155]:
                - listitem [ref=e156]:
                  - link "Set your invoice defaults Prefix, default due days, and footer notes used on every invoice you send." [ref=e157] [cursor=pointer]:
                    - /url: /dashboard/settings/invoice
                    - img [ref=e159]
                    - generic [ref=e161]:
                      - paragraph [ref=e162]: Set your invoice defaults
                      - paragraph [ref=e163]: Prefix, default due days, and footer notes used on every invoice you send.
                    - img [ref=e165]
                - listitem [ref=e167]:
                  - link "Add your signature Draw, type, or upload. It appears on every PDF and contract." [disabled] [ref=e168] [cursor=pointer]:
                    - /url: /dashboard/settings/profile#signature
                    - img [ref=e170]
                    - generic [ref=e173]:
                      - paragraph [ref=e174]: Add your signature
                      - paragraph [ref=e175]: Draw, type, or upload. It appears on every PDF and contract.
          - generic [ref=e176]:
            - generic [ref=e177]:
              - generic [ref=e178]: Business overview
              - generic [ref=e179]: Issued invoices are receivables, not revenue — cash collected is what actually moved into your bank.
            - generic [ref=e181]:
              - generic [ref=e182]:
                - generic:
                  - paragraph: Collected
                  - paragraph: ₹0
                  - paragraph: Paid invoices · all time
                - img [ref=e184]
              - generic [ref=e187]:
                - generic:
                  - paragraph: Outstanding
                  - paragraph: ₹2.3L
                  - paragraph: Issued but unpaid
                - img [ref=e189]
              - generic [ref=e198]:
                - generic:
                  - paragraph: Overdue
                  - paragraph: ₹0
                  - paragraph: 0% of outstanding
                - img [ref=e200]
              - generic [ref=e202]:
                - generic:
                  - paragraph: Active projects
                  - paragraph: "0"
                  - paragraph: Currently in flight
                - img [ref=e204]
              - generic [ref=e206]:
                - generic:
                  - paragraph: This week
                  - paragraph: 0h
                  - paragraph: No time logged yet
                - img [ref=e208]
          - generic [ref=e211]:
            - generic [ref=e212]:
              - generic [ref=e213]:
                - generic [ref=e214]: Revenue overview
                - generic [ref=e215]: Paid invoice revenue over the last 6 months
                - generic [ref=e217]: ₹0
              - generic [ref=e219]: Paid
            - generic [ref=e222]:
              - paragraph [ref=e223]: No revenue yet
              - paragraph [ref=e224]: Create paid invoices to see your revenue trend here.
          - generic [ref=e225]:
            - generic [ref=e227]:
              - generic [ref=e228]:
                - generic [ref=e229]:
                  - generic [ref=e230]: Recent invoices
                  - generic [ref=e231]: Latest activity across your invoices
                - link "View all →" [ref=e232] [cursor=pointer]:
                  - /url: /dashboard/invoices
              - table [ref=e236]:
                - rowgroup [ref=e237]:
                  - row "Invoice Client Amount Status Date" [ref=e238]:
                    - columnheader "Invoice" [ref=e239]
                    - columnheader "Client" [ref=e240]
                    - columnheader "Amount" [ref=e241]
                    - columnheader "Status" [ref=e242]
                    - columnheader "Date" [ref=e243]
                - rowgroup [ref=e244]:
                  - row "INV-0009 AE Acme Encore ₹15,000 Sent 30 May 2026" [ref=e245]:
                    - cell "INV-0009" [ref=e246]:
                      - link "INV-0009" [ref=e247] [cursor=pointer]:
                        - /url: /dashboard/invoices/80124be8-f5d0-4c3f-aa34-4cc1cae288e0
                    - cell "AE Acme Encore" [ref=e248]:
                      - link "AE Acme Encore" [ref=e249] [cursor=pointer]:
                        - /url: /dashboard/invoices/80124be8-f5d0-4c3f-aa34-4cc1cae288e0
                        - generic [ref=e251]: AE
                        - generic [ref=e252]: Acme Encore
                    - cell "₹15,000" [ref=e253]
                    - cell "Sent" [ref=e254]:
                      - generic [ref=e255]: Sent
                    - cell "30 May 2026" [ref=e259]
                  - row "INV-0008 AE Acme Encore ₹25,000 Sent 30 May 2026" [ref=e260]:
                    - cell "INV-0008" [ref=e261]:
                      - link "INV-0008" [ref=e262] [cursor=pointer]:
                        - /url: /dashboard/invoices/3234ded3-3e1d-4c2f-a4df-11cc7137ca10
                    - cell "AE Acme Encore" [ref=e263]:
                      - link "AE Acme Encore" [ref=e264] [cursor=pointer]:
                        - /url: /dashboard/invoices/3234ded3-3e1d-4c2f-a4df-11cc7137ca10
                        - generic [ref=e266]: AE
                        - generic [ref=e267]: Acme Encore
                    - cell "₹25,000" [ref=e268]
                    - cell "Sent" [ref=e269]:
                      - generic [ref=e270]: Sent
                    - cell "30 May 2026" [ref=e274]
                  - row "INV-0007 AE Acme Encore ₹50,000 Sent 30 May 2026" [ref=e275]:
                    - cell "INV-0007" [ref=e276]:
                      - link "INV-0007" [ref=e277] [cursor=pointer]:
                        - /url: /dashboard/invoices/ed1c1777-78f5-43d4-ab23-a942c771b8d2
                    - cell "AE Acme Encore" [ref=e278]:
                      - link "AE Acme Encore" [ref=e279] [cursor=pointer]:
                        - /url: /dashboard/invoices/ed1c1777-78f5-43d4-ab23-a942c771b8d2
                        - generic [ref=e281]: AE
                        - generic [ref=e282]: Acme Encore
                    - cell "₹50,000" [ref=e283]
                    - cell "Sent" [ref=e284]:
                      - generic [ref=e285]: Sent
                    - cell "30 May 2026" [ref=e289]
                  - row "INV-0006 AE Acme Encore ₹15,000 Sent 30 May 2026" [ref=e290]:
                    - cell "INV-0006" [ref=e291]:
                      - link "INV-0006" [ref=e292] [cursor=pointer]:
                        - /url: /dashboard/invoices/c3d42fea-9bd2-4f35-9818-1b37999c3c1f
                    - cell "AE Acme Encore" [ref=e293]:
                      - link "AE Acme Encore" [ref=e294] [cursor=pointer]:
                        - /url: /dashboard/invoices/c3d42fea-9bd2-4f35-9818-1b37999c3c1f
                        - generic [ref=e296]: AE
                        - generic [ref=e297]: Acme Encore
                    - cell "₹15,000" [ref=e298]
                    - cell "Sent" [ref=e299]:
                      - generic [ref=e300]: Sent
                    - cell "30 May 2026" [ref=e304]
                  - row "INV-0005 AE Acme Encore ₹25,000 Sent 30 May 2026" [ref=e305]:
                    - cell "INV-0005" [ref=e306]:
                      - link "INV-0005" [ref=e307] [cursor=pointer]:
                        - /url: /dashboard/invoices/0064a69b-e0bd-4070-8e66-9ae3677a4b10
                    - cell "AE Acme Encore" [ref=e308]:
                      - link "AE Acme Encore" [ref=e309] [cursor=pointer]:
                        - /url: /dashboard/invoices/0064a69b-e0bd-4070-8e66-9ae3677a4b10
                        - generic [ref=e311]: AE
                        - generic [ref=e312]: Acme Encore
                    - cell "₹25,000" [ref=e313]
                    - cell "Sent" [ref=e314]:
                      - generic [ref=e315]: Sent
                    - cell "30 May 2026" [ref=e319]
            - generic [ref=e320]:
              - generic [ref=e321]:
                - generic [ref=e322]: Activity
                - generic [ref=e323]: What's happening in your workspace
              - list [ref=e325]:
                - listitem [ref=e327]:
                  - img [ref=e329]
                  - generic [ref=e331]:
                    - paragraph [ref=e332]: Created project Create a new project called "Branding Refresh 65189", active status, 4-week timeline
                    - paragraph [ref=e333]: 9m ago
                - listitem [ref=e334]:
                  - img [ref=e336]
                  - generic [ref=e339]:
                    - paragraph [ref=e340]: Invoice INV-0009 sent to j.akshat296@gmail.com
                    - paragraph [ref=e341]: 10m ago
                - listitem [ref=e342]:
                  - img [ref=e344]
                  - generic [ref=e347]:
                    - paragraph [ref=e348]: Invoice marked sent
                    - paragraph [ref=e349]: 10m ago
                - listitem [ref=e350]:
                  - img [ref=e352]
                  - generic [ref=e355]:
                    - paragraph [ref=e356]: Created invoice INV-0009
                    - paragraph [ref=e357]: 10m ago
                - listitem [ref=e358]:
                  - img [ref=e360]
                  - generic [ref=e363]:
                    - paragraph [ref=e364]: Invoice marked sent
                    - paragraph [ref=e365]: 10m ago
                - listitem [ref=e366]:
                  - img [ref=e368]
                  - generic [ref=e371]:
                    - paragraph [ref=e372]: Created invoice INV-0008
                    - paragraph [ref=e373]: 10m ago
                - listitem [ref=e374]:
                  - img [ref=e376]
                  - generic [ref=e379]:
                    - paragraph [ref=e380]: Invoice marked sent
                    - paragraph [ref=e381]: 10m ago
                - listitem [ref=e382]:
                  - img [ref=e384]
                  - generic [ref=e387]:
                    - paragraph [ref=e388]: Created invoice INV-0007
                    - paragraph [ref=e389]: 10m ago
                - listitem [ref=e390]:
                  - img [ref=e392]
                  - generic [ref=e394]:
                    - paragraph [ref=e395]: Created project Create a new project called "Branding Refresh 34228", active status, 4-week timeline
                    - paragraph [ref=e396]: 23m ago
                - listitem [ref=e397]:
                  - img [ref=e399]
                  - generic [ref=e402]:
                    - paragraph [ref=e403]: Invoice INV-0006 sent to j.akshat296@gmail.com
                    - paragraph [ref=e404]: 23m ago
          - generic [ref=e405]:
            - generic [ref=e406]:
              - generic [ref=e407]:
                - generic [ref=e408]:
                  - generic [ref=e409]: Recent clients
                  - generic [ref=e410]: Latest additions to your roster
                - link "View all →" [ref=e411] [cursor=pointer]:
                  - /url: /dashboard/clients
              - list [ref=e413]:
                - listitem [ref=e414]:
                  - link "AD Add a new client called FreeForm Client 12038, email ff12038@example.com, based in Delhi No email" [ref=e415] [cursor=pointer]:
                    - /url: /dashboard/clients/7ef88c97-3091-43d5-9c86-1b4857a4c191
                    - generic [ref=e417]: AD
                    - generic [ref=e418]:
                      - paragraph [ref=e419]: Add a new client called FreeForm Client 12038, email ff12038@example.com, based in Delhi
                      - paragraph [ref=e420]: No email
                - listitem [ref=e421]:
                  - link "AE Acme Encore j.akshat296@gmail.com" [ref=e422] [cursor=pointer]:
                    - /url: /dashboard/clients/8cc212f3-a978-47cf-bad9-0f168b4d3ac1
                    - generic [ref=e424]: AE
                    - generic [ref=e425]:
                      - paragraph [ref=e426]: Acme Encore
                      - paragraph [ref=e427]: j.akshat296@gmail.com
            - generic [ref=e428]:
              - generic [ref=e429]:
                - generic [ref=e430]: Quick actions
                - generic [ref=e431]: One-click shortcuts
              - generic [ref=e432]:
                - list [ref=e433]:
                  - listitem [ref=e434]:
                    - link "Create invoice Bill a client" [ref=e435] [cursor=pointer]:
                      - /url: /dashboard/invoices/new
                      - img [ref=e437]
                      - generic [ref=e440]:
                        - paragraph [ref=e441]: Create invoice
                        - paragraph [ref=e442]: Bill a client
                      - img [ref=e443]
                  - listitem [ref=e446]:
                    - link "Add client New contact" [ref=e447] [cursor=pointer]:
                      - /url: /dashboard/clients
                      - img [ref=e449]
                      - generic [ref=e452]:
                        - paragraph [ref=e453]: Add client
                        - paragraph [ref=e454]: New contact
                      - img [ref=e455]
                  - listitem [ref=e458]:
                    - link "Log time Track an entry" [ref=e459] [cursor=pointer]:
                      - /url: /dashboard/time
                      - img [ref=e461]
                      - generic [ref=e463]:
                        - paragraph [ref=e464]: Log time
                        - paragraph [ref=e465]: Track an entry
                      - img [ref=e466]
                  - listitem [ref=e469]:
                    - link "Send reminder Nudge a payer" [ref=e470] [cursor=pointer]:
                      - /url: /dashboard/invoices
                      - img [ref=e472]
                      - generic [ref=e477]:
                        - paragraph [ref=e478]: Send reminder
                        - paragraph [ref=e479]: Nudge a payer
                      - img [ref=e480]
                - button "Refer a freelancer Both get 1 month Pro free" [ref=e484] [cursor=pointer]:
                  - img [ref=e486]
                  - generic [ref=e491]:
                    - paragraph [ref=e492]: Refer a freelancer
                    - paragraph [ref=e493]: Both get 1 month Pro free
                  - img [ref=e494]
            - generic [ref=e496]:
              - generic [ref=e497]:
                - generic [ref=e498]:
                  - generic [ref=e499]: Upcoming reminders
                  - generic [ref=e500]: Scheduled tasks & nudges
                - link "Manage →" [ref=e501] [cursor=pointer]:
                  - /url: /dashboard/invoices
              - generic [ref=e504]:
                - img [ref=e508]
                - heading "Nothing on the radar" [level=3] [ref=e510]
                - paragraph [ref=e511]: Reminders for overdue invoices and expiring contracts will appear here.
    - generic:
      - generic:
        - link:
          - /url: /dashboard/invoices/new
          - generic:
            - img
          - generic: New Invoice
          - img
        - link:
          - /url: /dashboard/contracts/new
          - generic:
            - img
          - generic: New Contract
          - img
        - link:
          - /url: /dashboard/clients?create=1
          - generic:
            - img
          - generic: New Client
          - img
        - link:
          - /url: /dashboard/projects?create=1
          - generic:
            - img
          - generic: New Project
          - img
    - generic:
      - generic:
        - generic:
          - paragraph: More pages
        - generic:
          - link:
            - /url: /dashboard/projects
            - img
            - generic: Projects
          - link:
            - /url: /dashboard/contracts
            - img
            - generic: Contracts
          - link:
            - /url: /dashboard/time
            - img
            - generic: Time
          - link:
            - /url: /dashboard/pulse
            - img
            - generic: Pulse
          - link:
            - /url: /dashboard/portal
            - img
            - generic: Portal
          - link:
            - /url: /dashboard/welcome
            - img
            - generic: Welcome Docs
          - link:
            - /url: /dashboard/settings
            - img
            - generic: Settings
          - link:
            - /url: /help
            - img
            - generic: Help & support
  - region "Notifications alt+T"
  - dialog "Install Stackivo":
    - generic [ref=e512]:
      - img [ref=e515]
      - generic [ref=e518]:
        - paragraph [ref=e519]: Install Stackivo
        - generic [ref=e521]:
          - text: Open your browser menu and choose
          - generic [ref=e522]:
            - img [ref=e523]
            - text: Install app
      - button "Dismiss install prompt" [ref=e526] [cursor=pointer]:
        - img
  - button "Open Next.js Dev Tools" [ref=e532] [cursor=pointer]:
    - generic [ref=e535]:
      - text: Rendering
      - generic [ref=e536]:
        - generic [ref=e537]: .
        - generic [ref=e538]: .
        - generic [ref=e539]: .
  - alert [ref=e540]
  - generic [ref=e541]:
    - generic [ref=e542]:
      - img [ref=e544]
      - generic [ref=e546]: Ask AI
      - button "← Back" [ref=e547] [cursor=pointer]
      - button "Expand" [ref=e548] [cursor=pointer]:
        - img [ref=e549]
      - button "Close" [ref=e554] [cursor=pointer]:
        - img [ref=e555]
    - generic [ref=e558]:
      - generic [ref=e559]:
        - generic [ref=e560]: Good to see you.
        - generic [ref=e561]: Tell me what you want to do, or pick a workflow. I can create invoices, contracts, welcome docs, clients, projects, log time, and answer support questions.
      - generic [ref=e562]:
        - generic [ref=e563]: Let's add a client. Tell me the details and I'll create the record.
        - generic [ref=e564]: Client or contact name?
      - generic [ref=e565]: E2E Test Client 44041
      - generic [ref=e566]: Business or company name? (optional)
      - generic [ref=e567]: E2E Test Client 44041 Corp
      - generic [ref=e568]: Email and phone? (optional)
      - generic [ref=e569]: e2etest44041@example.com, +91 9876500000
      - generic [ref=e570]: Billing address or city/state? (optional)
      - generic [ref=e571]: Mumbai, Maharashtra
      - generic [ref=e572]: Notes about this client? (optional)
      - generic [ref=e573]: Automated E2E test client — can be deleted
      - generic [ref=e575]:
        - generic [ref=e576]:
          - paragraph [ref=e577]: Client created
          - paragraph [ref=e578]: Added Client or contact name? to your workspace.
        - button "Open clients" [active] [ref=e579] [cursor=pointer]
    - generic [ref=e584]:
      - generic [ref=e585]:
        - 'textbox "Example: Retainer client, prefers email, fast approvals" [ref=e586]'
        - button "Send" [disabled] [ref=e587]:
          - img [ref=e588]
      - paragraph [ref=e590]: Powered by Qwen · Stackivo AI
```

# Test source

```ts
  1  | /**
  2  |  * Ask AI — client creation workflow E2E test.
  3  |  *
  4  |  * Required env:
  5  |  *   E2E_USER_EMAIL      -- non-admin user email
  6  |  *   E2E_USER_PASSWORD   -- its password
  7  |  */
  8  | 
  9  | import { test, expect } from "@playwright/test";
  10 | import { loginUser, openAiPanel, raceVisible, aiInput, aiSubmit } from "./helpers";
  11 | 
  12 | const USER_EMAIL = process.env.E2E_USER_EMAIL;
  13 | const USER_PASSWORD = process.env.E2E_USER_PASSWORD;
  14 | const HAS_CREDS = Boolean(USER_EMAIL && USER_PASSWORD);
  15 | 
  16 | const UNIQUE_SUFFIX = Date.now().toString().slice(-5);
  17 | const TEST_CLIENT_NAME = `E2E Test Client ${UNIQUE_SUFFIX}`;
  18 | 
  19 | test.describe("Ask AI client flow", () => {
  20 |   test.skip(!HAS_CREDS, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run Ask AI client tests.");
  21 | 
  22 |   test("creates a client record from chat", async ({ page }) => {
  23 |     test.setTimeout(90_000);
  24 | 
  25 |     await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
  26 |     await openAiPanel(page);
  27 |     await page.getByRole("button", { name: "Add client" }).click();
  28 | 
  29 |     // Step 1 — name
  30 |     await expect(page.getByText("Client or contact name?").first()).toBeVisible({ timeout: 8_000 });
  31 |     await aiSubmit(page, TEST_CLIENT_NAME);
  32 | 
  33 |     // Step 2 — business (optional)
  34 |     await expect(page.getByText(/Business or company name/i).first()).toBeVisible({ timeout: 8_000 });
  35 |     await aiSubmit(page, `${TEST_CLIENT_NAME} Corp`);
  36 | 
  37 |     // Step 3 — contact (optional)
  38 |     await expect(page.getByText(/Email and phone/i).first()).toBeVisible({ timeout: 8_000 });
  39 |     await aiSubmit(page, `e2etest${UNIQUE_SUFFIX}@example.com, +91 9876500000`);
  40 | 
  41 |     // Step 4 — billing (optional)
  42 |     await expect(page.getByText(/Billing address/i).first()).toBeVisible({ timeout: 8_000 });
  43 |     await aiSubmit(page, "Mumbai, Maharashtra");
  44 | 
  45 |     // Step 5 — notes (optional)
  46 |     await expect(page.getByText(/Notes about this client/i).first()).toBeVisible({ timeout: 8_000 });
  47 |     await aiSubmit(page, "Automated E2E test client — can be deleted");
  48 | 
  49 |     // Race against success vs error
  50 |     const result = await raceVisible(page, ["Client created", "Could not", "Tell me about the client"], 60_000);
  51 |     if (result.includes("Could not") || result.includes("Tell me about")) {
  52 |       throw new Error(`Client creation failed: "${result}"`);
  53 |     }
  54 | 
  55 |     await expect(page.getByText("Client created")).toBeVisible();
  56 |     await page.getByRole("button", { name: "Open clients" }).click();
> 57 |     await page.waitForURL((url) => url.pathname.startsWith("/dashboard/clients"), { timeout: 10_000 });
     |                ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  58 |   });
  59 | 
  60 |   test("creates a client via free-form prompt in general mode", async ({ page }) => {
  61 |     test.setTimeout(90_000);
  62 | 
  63 |     await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
  64 |     await openAiPanel(page);
  65 | 
  66 |     await aiSubmit(
  67 |       page,
  68 |       `Add a new client called FreeForm Client ${UNIQUE_SUFFIX}, email ff${UNIQUE_SUFFIX}@example.com, based in Delhi`,
  69 |     );
  70 | 
  71 |     // Wait for user message echo (confirms submission was processed)
  72 |     await expect(page.getByText(/FreeForm Client/i).first()).toBeVisible({ timeout: 10_000 });
  73 | 
  74 |     // Wait for AI response
  75 |     const result = await raceVisible(page, ["Client created", "Could not", "Client or contact name"], 45_000);
  76 |     if (result.includes("Could not")) {
  77 |       throw new Error(`Free-form client creation failed: "${result}"`);
  78 |     }
  79 | 
  80 |     const assistantMessages = page.locator(".mr-auto.bg-muted\\/60");
  81 |     expect(await assistantMessages.count()).toBeGreaterThan(1);
  82 |   });
  83 | });
  84 | 
```