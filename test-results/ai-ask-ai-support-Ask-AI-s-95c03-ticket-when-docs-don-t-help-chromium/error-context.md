# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ai\ask-ai-support.spec.ts >> Ask AI support flow >> routes to support ticket when docs don't help
- Location: e2e\ai\ask-ai-support.spec.ts:108:7

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Send to support' })

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
                    - paragraph [ref=e380]: 1m ago
                - listitem [ref=e381]:
                  - img [ref=e383]
                  - generic [ref=e386]:
                    - paragraph [ref=e387]: "Created contract: Acme Encore Landing Page Redesign and CMS Setup Agreement"
                    - paragraph [ref=e388]: 1m ago
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
  - button "Open Next.js Dev Tools" [ref=e530] [cursor=pointer]:
    - img [ref=e531]
  - alert [ref=e534]: Dashboard · Stackivo
  - dialog "Install Stackivo":
    - generic [ref=e535]:
      - img [ref=e538]
      - generic [ref=e541]:
        - paragraph [ref=e542]: Install Stackivo
        - generic [ref=e544]:
          - text: Open your browser menu and choose
          - generic [ref=e545]:
            - img [ref=e546]
            - text: Install app
      - button "Dismiss install prompt" [ref=e549] [cursor=pointer]:
        - img
  - generic [ref=e550]:
    - generic [ref=e551]:
      - img [ref=e553]
      - generic [ref=e555]: Ask AI
      - button "← Back" [ref=e556] [cursor=pointer]
      - button "Expand" [ref=e557] [cursor=pointer]:
        - img [ref=e558]
      - button "Close" [ref=e563] [cursor=pointer]:
        - img [ref=e564]
    - generic [ref=e567]:
      - generic [ref=e568]:
        - generic [ref=e569]: Good to see you.
        - generic [ref=e570]: Tell me what you want to do, or pick a workflow. I can create invoices, contracts, welcome docs, clients, projects, log time, and answer support questions.
      - generic [ref=e571]:
        - generic [ref=e572]: I can answer from docs, privacy, or terms — or send this to support.
        - generic [ref=e573]: What do you need help with?
      - generic [ref=e574]: My invoice PDF has a rendering issue with custom brand fonts on Windows only
      - generic [ref=e575]: Which page or workflow were you using? (optional)
    - generic [ref=e576]:
      - generic [ref=e577]:
        - 'textbox "Example: invoices page, contract builder" [active] [ref=e578]': invoices page
        - button "Send" [ref=e579] [cursor=pointer]:
          - img [ref=e580]
      - paragraph [ref=e582]: Powered by Qwen · Stackivo AI
```

# Test source

```ts
  28  |     await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
  29  |     await openAiPanel(page);
  30  | 
  31  |     await page.getByRole("button", { name: "Support" }).click();
  32  | 
  33  |     const input = aiInput(page);
  34  | 
  35  |     // Step 1 — question
  36  |     await expect(page.getByText("What do you need help with?")).toBeVisible({
  37  |       timeout: 8_000,
  38  |     });
  39  |     await input.fill("How do I create an invoice using Ask AI?");
  40  |     await input.press("Enter");
  41  | 
  42  |     // Step 2 — page context (optional)
  43  |     await input.fill("skip");
  44  |     await input.press("Enter");
  45  | 
  46  |     // Step 3 — route choice
  47  |     await page
  48  |       .getByRole("button", { name: "Answer from docs first" })
  49  |       .click();
  50  | 
  51  |     // The AI should respond with an answer (not a generic fallback)
  52  |     // We race against possible outcomes
  53  |     const result = await raceVisible(
  54  |       page,
  55  |       [
  56  |         "Invoice",
  57  |         "invoice",
  58  |         "I could not read",
  59  |         "sent to Stackivo support",
  60  |         "Could not",
  61  |       ],
  62  |       45_000,
  63  |     );
  64  | 
  65  |     // Any of these indicates the support flow completed (answer or fallback)
  66  |     expect(
  67  |       result.length > 0,
  68  |       `Support flow did not produce a visible response. Last matched: "${result}"`,
  69  |     ).toBe(true);
  70  | 
  71  |     // There should be at least one assistant message beyond the greeting
  72  |     const assistantMessages = page.locator(".mr-auto.bg-muted\\/60");
  73  |     const count = await assistantMessages.count();
  74  |     expect(count).toBeGreaterThan(1);
  75  |   });
  76  | 
  77  |   test("answers a privacy policy question", async ({ page }) => {
  78  |     test.setTimeout(90_000);
  79  | 
  80  |     await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
  81  |     await openAiPanel(page);
  82  | 
  83  |     await page.getByRole("button", { name: "Support" }).click();
  84  | 
  85  |     const input = aiInput(page);
  86  | 
  87  |     await input.fill("What data does Stackivo collect about me?");
  88  |     await input.press("Enter");
  89  | 
  90  |     await input.fill("skip");
  91  |     await input.press("Enter");
  92  | 
  93  |     await page
  94  |       .getByRole("button", { name: "Answer from docs first" })
  95  |       .click();
  96  | 
  97  |     // Should produce some kind of response in under 45s
  98  |     await raceVisible(
  99  |       page,
  100 |       ["data", "privacy", "collect", "I could not", "sent to Stackivo"],
  101 |       45_000,
  102 |     );
  103 | 
  104 |     const assistantMessages = page.locator(".mr-auto.bg-muted\\/60");
  105 |     expect(await assistantMessages.count()).toBeGreaterThan(1);
  106 |   });
  107 | 
  108 |   test("routes to support ticket when docs don't help", async ({ page }) => {
  109 |     test.setTimeout(90_000);
  110 | 
  111 |     await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
  112 |     await openAiPanel(page);
  113 | 
  114 |     await page.getByRole("button", { name: "Support" }).click();
  115 | 
  116 |     const input = aiInput(page);
  117 | 
  118 |     // Extremely specific question unlikely to be in docs
  119 |     await input.fill(
  120 |       "My invoice PDF has a rendering issue with custom brand fonts on Windows only",
  121 |     );
  122 |     await input.press("Enter");
  123 | 
  124 |     await input.fill("invoices page");
  125 |     await input.press("Enter");
  126 | 
  127 |     // Choose "Send to support" directly
> 128 |     await page.getByRole("button", { name: "Send to support" }).click();
      |                                                                 ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  129 | 
  130 |     await raceVisible(
  131 |       page,
  132 |       ["sent to Stackivo support", "I sent this", "support", "Could not"],
  133 |       30_000,
  134 |     );
  135 | 
  136 |     const assistantMessages = page.locator(".mr-auto.bg-muted\\/60");
  137 |     expect(await assistantMessages.count()).toBeGreaterThan(1);
  138 |   });
  139 | 
  140 |   test("free-form help question routes through support", async ({ page }) => {
  141 |     test.setTimeout(90_000);
  142 | 
  143 |     await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
  144 |     await openAiPanel(page);
  145 | 
  146 |     const input = aiInput(page);
  147 |     await input.fill("How do I set up GST on my invoices?");
  148 |     await input.press("Enter");
  149 | 
  150 |     // Should produce a response of some kind
  151 |     await raceVisible(
  152 |       page,
  153 |       ["GST", "gst", "tax", "sent to Stackivo", "I could not"],
  154 |       45_000,
  155 |     );
  156 | 
  157 |     const assistantMessages = page.locator(".mr-auto.bg-muted\\/60");
  158 |     expect(await assistantMessages.count()).toBeGreaterThan(1);
  159 |   });
  160 | });
  161 | 
```