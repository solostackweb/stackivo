# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ai\ask-ai-time-entry.spec.ts >> Ask AI time entry flow >> Open time tracker button navigates to /dashboard/time
- Location: e2e\ai\ask-ai-time-entry.spec.ts:83:7

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
                - text: 1 client slot remaining on your free plan.
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
                  - paragraph: ₹3.0L
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
                  - row "INV-0011 AE Acme Encore ₹25,000 Sent 30 May 2026" [ref=e245]:
                    - cell "INV-0011" [ref=e246]:
                      - link "INV-0011" [ref=e247] [cursor=pointer]:
                        - /url: /dashboard/invoices/b9069b50-a75b-41c7-8f6a-50621bdde594
                    - cell "AE Acme Encore" [ref=e248]:
                      - link "AE Acme Encore" [ref=e249] [cursor=pointer]:
                        - /url: /dashboard/invoices/b9069b50-a75b-41c7-8f6a-50621bdde594
                        - generic [ref=e251]: AE
                        - generic [ref=e252]: Acme Encore
                    - cell "₹25,000" [ref=e253]
                    - cell "Sent" [ref=e254]:
                      - generic [ref=e255]: Sent
                    - cell "30 May 2026" [ref=e259]
                  - row "INV-0010 AE Acme Encore ₹50,000 Sent 30 May 2026" [ref=e260]:
                    - cell "INV-0010" [ref=e261]:
                      - link "INV-0010" [ref=e262] [cursor=pointer]:
                        - /url: /dashboard/invoices/7516f38c-ca06-4fe2-b9a8-789d4e957793
                    - cell "AE Acme Encore" [ref=e263]:
                      - link "AE Acme Encore" [ref=e264] [cursor=pointer]:
                        - /url: /dashboard/invoices/7516f38c-ca06-4fe2-b9a8-789d4e957793
                        - generic [ref=e266]: AE
                        - generic [ref=e267]: Acme Encore
                    - cell "₹50,000" [ref=e268]
                    - cell "Sent" [ref=e269]:
                      - generic [ref=e270]: Sent
                    - cell "30 May 2026" [ref=e274]
                  - row "INV-0009 AE Acme Encore ₹15,000 Sent 30 May 2026" [ref=e275]:
                    - cell "INV-0009" [ref=e276]:
                      - link "INV-0009" [ref=e277] [cursor=pointer]:
                        - /url: /dashboard/invoices/80124be8-f5d0-4c3f-aa34-4cc1cae288e0
                    - cell "AE Acme Encore" [ref=e278]:
                      - link "AE Acme Encore" [ref=e279] [cursor=pointer]:
                        - /url: /dashboard/invoices/80124be8-f5d0-4c3f-aa34-4cc1cae288e0
                        - generic [ref=e281]: AE
                        - generic [ref=e282]: Acme Encore
                    - cell "₹15,000" [ref=e283]
                    - cell "Sent" [ref=e284]:
                      - generic [ref=e285]: Sent
                    - cell "30 May 2026" [ref=e289]
                  - row "INV-0008 AE Acme Encore ₹25,000 Sent 30 May 2026" [ref=e290]:
                    - cell "INV-0008" [ref=e291]:
                      - link "INV-0008" [ref=e292] [cursor=pointer]:
                        - /url: /dashboard/invoices/3234ded3-3e1d-4c2f-a4df-11cc7137ca10
                    - cell "AE Acme Encore" [ref=e293]:
                      - link "AE Acme Encore" [ref=e294] [cursor=pointer]:
                        - /url: /dashboard/invoices/3234ded3-3e1d-4c2f-a4df-11cc7137ca10
                        - generic [ref=e296]: AE
                        - generic [ref=e297]: Acme Encore
                    - cell "₹25,000" [ref=e298]
                    - cell "Sent" [ref=e299]:
                      - generic [ref=e300]: Sent
                    - cell "30 May 2026" [ref=e304]
                  - row "INV-0007 AE Acme Encore ₹50,000 Sent 30 May 2026" [ref=e305]:
                    - cell "INV-0007" [ref=e306]:
                      - link "INV-0007" [ref=e307] [cursor=pointer]:
                        - /url: /dashboard/invoices/ed1c1777-78f5-43d4-ab23-a942c771b8d2
                    - cell "AE Acme Encore" [ref=e308]:
                      - link "AE Acme Encore" [ref=e309] [cursor=pointer]:
                        - /url: /dashboard/invoices/ed1c1777-78f5-43d4-ab23-a942c771b8d2
                        - generic [ref=e311]: AE
                        - generic [ref=e312]: Acme Encore
                    - cell "₹50,000" [ref=e313]
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
                    - paragraph [ref=e332]: Created project Branding Refresh 58805
                    - paragraph [ref=e333]: Just now
                - listitem [ref=e334]:
                  - img [ref=e336]
                  - generic [ref=e338]:
                    - paragraph [ref=e339]: Created project E2E Project 33515
                    - paragraph [ref=e340]: 1m ago
                - listitem [ref=e341]:
                  - img [ref=e343]
                  - generic [ref=e346]:
                    - paragraph [ref=e347]: Invoice marked sent
                    - paragraph [ref=e348]: 1m ago
                - listitem [ref=e349]:
                  - img [ref=e351]
                  - generic [ref=e354]:
                    - paragraph [ref=e355]: Created invoice INV-0011
                    - paragraph [ref=e356]: 1m ago
                - listitem [ref=e357]:
                  - img [ref=e359]
                  - generic [ref=e362]:
                    - paragraph [ref=e363]: Invoice marked sent
                    - paragraph [ref=e364]: 1m ago
                - listitem [ref=e365]:
                  - img [ref=e367]
                  - generic [ref=e370]:
                    - paragraph [ref=e371]: Created invoice INV-0010
                    - paragraph [ref=e372]: 1m ago
                - listitem [ref=e373]:
                  - img [ref=e375]
                  - generic [ref=e378]:
                    - paragraph [ref=e379]: "Created contract: Acme Encore Branding and Design Service Agreement"
                    - paragraph [ref=e380]: 2m ago
                - listitem [ref=e381]:
                  - img [ref=e383]
                  - generic [ref=e386]:
                    - paragraph [ref=e387]: "Created contract: Acme Encore Landing Page Redesign and CMS Setup Agreement"
                    - paragraph [ref=e388]: 2m ago
                - listitem [ref=e389]:
                  - img [ref=e391]
                  - generic [ref=e393]:
                    - paragraph [ref=e394]: Created project Create a new project called "Branding Refresh 65189", active status, 4-week timeline
                    - paragraph [ref=e395]: 12m ago
                - listitem [ref=e396]:
                  - img [ref=e398]
                  - generic [ref=e401]:
                    - paragraph [ref=e402]: Invoice INV-0009 sent to j.akshat296@gmail.com
                    - paragraph [ref=e403]: 12m ago
          - generic [ref=e404]:
            - generic [ref=e405]:
              - generic [ref=e406]:
                - generic [ref=e407]:
                  - generic [ref=e408]: Recent clients
                  - generic [ref=e409]: Latest additions to your roster
                - link "View all →" [ref=e410] [cursor=pointer]:
                  - /url: /dashboard/clients
              - list [ref=e412]:
                - listitem [ref=e413]:
                  - link "AD Add a new client called FreeForm Client 44039, email ff44039@example.com, based in Delhi No email" [ref=e414] [cursor=pointer]:
                    - /url: /dashboard/clients/d93809b2-5a70-4168-a5a2-ffad5aa39366
                    - generic [ref=e416]: AD
                    - generic [ref=e417]:
                      - paragraph [ref=e418]: Add a new client called FreeForm Client 44039, email ff44039@example.com, based in Delhi
                      - paragraph [ref=e419]: No email
                - listitem [ref=e420]:
                  - link "CN Client or contact name? No email" [ref=e421] [cursor=pointer]:
                    - /url: /dashboard/clients/2a218dd2-eb8b-4fa3-8f1c-dff1c49d6979
                    - generic [ref=e423]: CN
                    - generic [ref=e424]:
                      - paragraph [ref=e425]: Client or contact name?
                      - paragraph [ref=e426]: No email
                - listitem [ref=e427]:
                  - link "AD Add a new client called FreeForm Client 12038, email ff12038@example.com, based in Delhi No email" [ref=e428] [cursor=pointer]:
                    - /url: /dashboard/clients/7ef88c97-3091-43d5-9c86-1b4857a4c191
                    - generic [ref=e430]: AD
                    - generic [ref=e431]:
                      - paragraph [ref=e432]: Add a new client called FreeForm Client 12038, email ff12038@example.com, based in Delhi
                      - paragraph [ref=e433]: No email
                - listitem [ref=e434]:
                  - link "AE Acme Encore j.akshat296@gmail.com" [ref=e435] [cursor=pointer]:
                    - /url: /dashboard/clients/8cc212f3-a978-47cf-bad9-0f168b4d3ac1
                    - generic [ref=e437]: AE
                    - generic [ref=e438]:
                      - paragraph [ref=e439]: Acme Encore
                      - paragraph [ref=e440]: j.akshat296@gmail.com
            - generic [ref=e441]:
              - generic [ref=e442]:
                - generic [ref=e443]: Quick actions
                - generic [ref=e444]: One-click shortcuts
              - generic [ref=e445]:
                - list [ref=e446]:
                  - listitem [ref=e447]:
                    - link "Create invoice Bill a client" [ref=e448] [cursor=pointer]:
                      - /url: /dashboard/invoices/new
                      - img [ref=e450]
                      - generic [ref=e453]:
                        - paragraph [ref=e454]: Create invoice
                        - paragraph [ref=e455]: Bill a client
                      - img [ref=e456]
                  - listitem [ref=e459]:
                    - link "Add client New contact" [ref=e460] [cursor=pointer]:
                      - /url: /dashboard/clients
                      - img [ref=e462]
                      - generic [ref=e465]:
                        - paragraph [ref=e466]: Add client
                        - paragraph [ref=e467]: New contact
                      - img [ref=e468]
                  - listitem [ref=e471]:
                    - link "Log time Track an entry" [ref=e472] [cursor=pointer]:
                      - /url: /dashboard/time
                      - img [ref=e474]
                      - generic [ref=e476]:
                        - paragraph [ref=e477]: Log time
                        - paragraph [ref=e478]: Track an entry
                      - img [ref=e479]
                  - listitem [ref=e482]:
                    - link "Send reminder Nudge a payer" [ref=e483] [cursor=pointer]:
                      - /url: /dashboard/invoices
                      - img [ref=e485]
                      - generic [ref=e490]:
                        - paragraph [ref=e491]: Send reminder
                        - paragraph [ref=e492]: Nudge a payer
                      - img [ref=e493]
                - button "Refer a freelancer Both get 1 month Pro free" [ref=e497] [cursor=pointer]:
                  - img [ref=e499]
                  - generic [ref=e504]:
                    - paragraph [ref=e505]: Refer a freelancer
                    - paragraph [ref=e506]: Both get 1 month Pro free
                  - img [ref=e507]
            - generic [ref=e509]:
              - generic [ref=e510]:
                - generic [ref=e511]:
                  - generic [ref=e512]: Upcoming reminders
                  - generic [ref=e513]: Scheduled tasks & nudges
                - link "Manage →" [ref=e514] [cursor=pointer]:
                  - /url: /dashboard/invoices
              - generic [ref=e517]:
                - img [ref=e521]
                - heading "Nothing on the radar" [level=3] [ref=e523]
                - paragraph [ref=e524]: Reminders for overdue invoices and expiring contracts will appear here.
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
    - generic [ref=e525]:
      - img [ref=e528]
      - generic [ref=e531]:
        - paragraph [ref=e532]: Install Stackivo
        - generic [ref=e534]:
          - text: Open your browser menu and choose
          - generic [ref=e535]:
            - img [ref=e536]
            - text: Install app
      - button "Dismiss install prompt" [ref=e539] [cursor=pointer]:
        - img
  - button "Open Next.js Dev Tools" [ref=e545] [cursor=pointer]:
    - generic [ref=e548]:
      - text: Compiling
      - generic [ref=e549]:
        - generic [ref=e550]: .
        - generic [ref=e551]: .
        - generic [ref=e552]: .
  - alert [ref=e553]
  - generic [ref=e554]:
    - generic [ref=e555]:
      - img [ref=e557]
      - generic [ref=e559]: Ask AI
      - button "← Back" [ref=e560] [cursor=pointer]
      - button "Expand" [ref=e561] [cursor=pointer]:
        - img [ref=e562]
      - button "Close" [ref=e567] [cursor=pointer]:
        - img [ref=e568]
    - generic [ref=e571]:
      - combobox [ref=e572]:
        - option "No client" [selected]
        - option "Add a new client called FreeForm Client 44039, email ff44039@example.com, based in Delhi"
        - option "Client or contact name?"
        - option "Add a new client called FreeForm Client 12038, email ff12038@example.com, based in Delhi"
        - option "Acme Encore"
      - combobox [ref=e573]:
        - option "No project" [selected]
        - option "Branding Refresh 58805"
        - option "E2E Project 33515"
        - option "Create a new project called \"Branding Refresh 65189\", active status, 4-week timeline"
        - option "Create a new project called \"Branding Refresh 34228\", active status, 4-week timeline"
    - generic [ref=e574]:
      - generic [ref=e575]:
        - generic [ref=e576]: Good to see you.
        - generic [ref=e577]: Tell me what you want to do, or pick a workflow. I can create invoices, contracts, welcome docs, clients, projects, log time, and answer support questions.
      - generic [ref=e578]:
        - generic [ref=e579]: Let's log some time. Which project and how long?
        - generic [ref=e580]: Which project should I log this against? (optional)
      - generic [ref=e581]: Skip
      - generic [ref=e582]: What work did you do?
      - generic [ref=e583]: Design review and feedback session
      - generic [ref=e584]: How long? And is this billable?
      - generic [ref=e585]: 1 hour, billable
      - generic [ref=e587]:
        - generic [ref=e588]:
          - paragraph [ref=e589]: Time entry drafted
          - paragraph [ref=e590]: Design review and feedback session — 1h 0m · billable. Open the time tracker to review and save.
        - button "Open time tracker" [active] [ref=e591] [cursor=pointer]
    - generic [ref=e592]:
      - generic [ref=e593]:
        - textbox "Type your answer…" [ref=e594]
        - button "Send" [disabled] [ref=e595]:
          - img [ref=e596]
      - paragraph [ref=e598]: Powered by Qwen · Stackivo AI
```

# Test source

```ts
  12  | const USER_EMAIL = process.env.E2E_USER_EMAIL;
  13  | const USER_PASSWORD = process.env.E2E_USER_PASSWORD;
  14  | const HAS_CREDS = Boolean(USER_EMAIL && USER_PASSWORD);
  15  | 
  16  | test.describe("Ask AI time entry flow", () => {
  17  |   test.skip(!HAS_CREDS, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run Ask AI time entry tests.");
  18  | 
  19  |   test("drafts a time entry and shows time tracker link", async ({ page }) => {
  20  |     test.setTimeout(90_000);
  21  | 
  22  |     await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
  23  |     await openAiPanel(page);
  24  |     await page.getByRole("button", { name: "Log time" }).click();
  25  | 
  26  |     const input = aiInput(page);
  27  | 
  28  |     // Step 1 — project (optional): use Skip button or type skip
  29  |     await expect(page.getByText(/Which project.*log/i).first()).toBeVisible({ timeout: 8_000 });
  30  |     const skipBtn = page.getByRole("button", { name: "Skip" }).first();
  31  |     if (await skipBtn.isVisible()) {
  32  |       await skipBtn.click();
  33  |       await expect(input).toHaveValue("", { timeout: 8_000 });
  34  |     } else {
  35  |       await aiSubmit(page, "skip");
  36  |     }
  37  | 
  38  |     // Step 2 — what work
  39  |     await expect(page.getByText("What work did you do?").first()).toBeVisible({ timeout: 8_000 });
  40  |     await aiSubmit(page, "Client calls and wireframe revisions for homepage");
  41  | 
  42  |     // Step 3 — duration + billable
  43  |     await expect(page.getByText(/How long.*billable/i).first()).toBeVisible({ timeout: 8_000 });
  44  |     await aiSubmit(page, "2 hours 30 minutes, billable");
  45  | 
  46  |     const result = await raceVisible(
  47  |       page,
  48  |       ["Time entry drafted", "Could not", "AI draft generation is temporarily unavailable"],
  49  |       45_000,
  50  |     );
  51  |     if (result.includes("Could not") || result.includes("unavailable")) {
  52  |       throw new Error(`Time entry draft failed: "${result}"`);
  53  |     }
  54  | 
  55  |     await expect(page.getByText("Time entry drafted")).toBeVisible();
  56  |     await expect(page.getByRole("button", { name: "Open time tracker" })).toBeVisible();
  57  |   });
  58  | 
  59  |   test("logs time via free-form prompt", async ({ page }) => {
  60  |     test.setTimeout(90_000);
  61  | 
  62  |     await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
  63  |     await openAiPanel(page);
  64  | 
  65  |     await aiSubmit(page, "Log 1 hour 15 minutes billable time for code review");
  66  | 
  67  |     await expect(page.getByText(/code review/i).first()).toBeVisible({ timeout: 10_000 });
  68  | 
  69  |     const result = await raceVisible(
  70  |       page,
  71  |       ["Time entry drafted", "Could not", "What work did you do"],
  72  |       45_000,
  73  |     );
  74  |     if (result.includes("Could not")) {
  75  |       throw new Error(`Free-form time log failed: "${result}"`);
  76  |     }
  77  | 
  78  |     const drafted = await page.getByText("Time entry drafted").isVisible();
  79  |     const workflowStarted = await page.getByText(/What work did you do/i).isVisible();
  80  |     expect(drafted || workflowStarted).toBe(true);
  81  |   });
  82  | 
  83  |   test("Open time tracker button navigates to /dashboard/time", async ({ page }) => {
  84  |     test.setTimeout(90_000);
  85  | 
  86  |     await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
  87  |     await openAiPanel(page);
  88  |     await page.getByRole("button", { name: "Log time" }).click();
  89  | 
  90  |     const input = aiInput(page);
  91  | 
  92  |     // Step 1 — project (optional)
  93  |     await expect(page.getByText(/Which project.*log/i).first()).toBeVisible({ timeout: 8_000 });
  94  |     const skipBtn = page.getByRole("button", { name: "Skip" }).first();
  95  |     if (await skipBtn.isVisible()) {
  96  |       await skipBtn.click();
  97  |       await expect(input).toHaveValue("", { timeout: 8_000 });
  98  |     } else {
  99  |       await aiSubmit(page, "skip");
  100 |     }
  101 | 
  102 |     // Step 2 — what work
  103 |     await expect(page.getByText("What work did you do?").first()).toBeVisible({ timeout: 8_000 });
  104 |     await aiSubmit(page, "Design review and feedback session");
  105 | 
  106 |     // Step 3 — duration
  107 |     await expect(page.getByText(/How long.*billable/i).first()).toBeVisible({ timeout: 8_000 });
  108 |     await aiSubmit(page, "1 hour, billable");
  109 | 
  110 |     await expect(page.getByText("Time entry drafted")).toBeVisible({ timeout: 60_000 });
  111 |     await page.getByRole("button", { name: "Open time tracker" }).click();
> 112 |     await page.waitForURL((url) => url.pathname.startsWith("/dashboard/time"), { timeout: 10_000 });
      |                ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  113 |   });
  114 | });
  115 | 
```