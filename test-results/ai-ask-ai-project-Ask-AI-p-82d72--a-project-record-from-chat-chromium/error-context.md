# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ai\ask-ai-project.spec.ts >> Ask AI project flow >> creates a project record from chat
- Location: e2e\ai\ask-ai-project.spec.ts:24:7

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
            - img [ref=e15]
            - generic [ref=e20]: Dashboard
          - link "Clients" [ref=e21] [cursor=pointer]:
            - /url: /dashboard/clients
            - img [ref=e22]
            - generic [ref=e27]: Clients
          - link "Projects" [ref=e28] [cursor=pointer]:
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
              - link "Dashboard" [ref=e103] [cursor=pointer]:
                - /url: /dashboard
            - listitem [ref=e104]:
              - img [ref=e105]
              - generic [ref=e107]: Projects
        - button "Open command palette" [ref=e109] [cursor=pointer]:
          - img [ref=e110]
          - generic [ref=e113]: Search or jump to…
          - generic:
            - generic: ⌘
            - text: K
        - generic [ref=e114]:
          - button "Notifications, 2 unread" [ref=e115] [cursor=pointer]:
            - img
          - button "Toggle theme" [ref=e120] [cursor=pointer]:
            - img
            - img
            - generic [ref=e121]: Toggle theme
          - button "AJ" [ref=e122] [cursor=pointer]:
            - generic [ref=e124]: AJ
      - main [ref=e125]:
        - generic [ref=e127]:
          - generic [ref=e128]:
            - generic [ref=e129]:
              - heading "Projects" [level=1] [ref=e130]
              - paragraph [ref=e131]: Organize work, files, and billables by engagement.
            - button "New project" [ref=e133] [cursor=pointer]:
              - img
              - text: New project
          - generic [ref=e134]:
            - generic [ref=e135]:
              - img [ref=e136]
              - textbox "Search projects…" [ref=e139]
            - generic [ref=e140]:
              - combobox [ref=e141] [cursor=pointer]:
                - generic: All statuses
                - img [ref=e142]
              - generic [ref=e144]:
                - button "Grid" [pressed] [ref=e145] [cursor=pointer]:
                  - img [ref=e146]
                  - text: Grid
                - button "Kanban" [ref=e151] [cursor=pointer]:
                  - img [ref=e152]
                  - text: Kanban
          - generic [ref=e154]:
            - link "Change status. Currently Planning. E2E Project 33515 Acme Encore Select project Full-stack web app, user auth, dashboard, REST API, deployment on Vercel Created 31 May 14 Jul" [ref=e155] [cursor=pointer]:
              - /url: /dashboard/projects/46524922-fdff-45f8-b6ac-4e0c57717bed
              - generic [ref=e157]:
                - generic [ref=e158]:
                  - generic [ref=e159]:
                    - button "Change status. Currently Planning." [ref=e161]:
                      - generic [ref=e164]: Planning
                      - img [ref=e165]
                    - heading "E2E Project 33515" [level=3] [ref=e167]
                    - paragraph [ref=e168]:
                      - img [ref=e169]
                      - text: Acme Encore
                  - checkbox "Select project" [ref=e175]
                - paragraph [ref=e176]: Full-stack web app, user auth, dashboard, REST API, deployment on Vercel
                - generic [ref=e177]:
                  - generic [ref=e178]: Created 31 May
                  - generic [ref=e179]:
                    - img [ref=e180]
                    - text: 14 Jul
            - link "Change status. Currently Planning. Create a new project called \"Branding Refresh 65189\", active status, 4-week timeline No client assigned Select project Create a new project called \"Branding Refresh 65189\", active status, 4-week timeline Created 31 May No due date" [ref=e182] [cursor=pointer]:
              - /url: /dashboard/projects/4b782c03-e9e4-4836-9c25-f45ae61973dd
              - generic [ref=e184]:
                - generic [ref=e185]:
                  - generic [ref=e186]:
                    - button "Change status. Currently Planning." [ref=e188]:
                      - generic [ref=e191]: Planning
                      - img [ref=e192]
                    - heading "Create a new project called \"Branding Refresh 65189\", active status, 4-week timeline" [level=3] [ref=e194]
                    - paragraph [ref=e195]: No client assigned
                  - checkbox "Select project" [ref=e197]
                - paragraph [ref=e198]: Create a new project called "Branding Refresh 65189", active status, 4-week timeline
                - generic [ref=e199]:
                  - generic [ref=e200]: Created 31 May
                  - generic [ref=e201]:
                    - img [ref=e202]
                    - text: No due date
            - link "Change status. Currently Planning. Create a new project called \"Branding Refresh 34228\", active status, 4-week timeline No client assigned Select project Create a new project called \"Branding Refresh 34228\", active status, 4-week timeline Created 31 May No due date" [ref=e204] [cursor=pointer]:
              - /url: /dashboard/projects/79372551-219d-4bc0-94af-6dcf22b7278d
              - generic [ref=e206]:
                - generic [ref=e207]:
                  - generic [ref=e208]:
                    - button "Change status. Currently Planning." [ref=e210]:
                      - generic [ref=e213]: Planning
                      - img [ref=e214]
                    - heading "Create a new project called \"Branding Refresh 34228\", active status, 4-week timeline" [level=3] [ref=e216]
                    - paragraph [ref=e217]: No client assigned
                  - checkbox "Select project" [ref=e219]
                - paragraph [ref=e220]: Create a new project called "Branding Refresh 34228", active status, 4-week timeline
                - generic [ref=e221]:
                  - generic [ref=e222]: Created 31 May
                  - generic [ref=e223]:
                    - img [ref=e224]
                    - text: No due date
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
  - button "Open Next.js Dev Tools" [ref=e231] [cursor=pointer]:
    - img [ref=e232]
  - alert [ref=e235]: Projects · Stackivo
  - dialog "Install Stackivo":
    - generic [ref=e236]:
      - img [ref=e239]
      - generic [ref=e242]:
        - paragraph [ref=e243]: Install Stackivo
        - generic [ref=e245]:
          - text: Open your browser menu and choose
          - generic [ref=e246]:
            - img [ref=e247]
            - text: Install app
      - button "Dismiss install prompt" [ref=e250] [cursor=pointer]:
        - img
  - generic [ref=e251]:
    - generic [ref=e252]:
      - img [ref=e254]
      - generic [ref=e256]: Ask AI
      - button "← Back" [ref=e257] [cursor=pointer]
      - button "Expand" [ref=e258] [cursor=pointer]:
        - img [ref=e259]
      - button "Close" [ref=e264] [cursor=pointer]:
        - img [ref=e265]
    - generic [ref=e268]:
      - combobox [ref=e269]:
        - option "No client"
        - option "Add a new client called FreeForm Client 44039, email ff44039@example.com, based in Delhi"
        - option "Client or contact name?"
        - option "Add a new client called FreeForm Client 12038, email ff12038@example.com, based in Delhi"
        - option "Acme Encore" [selected]
      - combobox [ref=e270]:
        - option "No project" [selected]
        - option "E2E Project 33515"
    - generic [ref=e271]:
      - generic [ref=e272]:
        - generic [ref=e273]: Good to see you.
        - generic [ref=e274]: Tell me what you want to do, or pick a workflow. I can create invoices, contracts, welcome docs, clients, projects, log time, and answer support questions.
      - generic [ref=e275]:
        - generic [ref=e276]: Let's create a project. Tell me the name, scope, and timeline.
        - generic [ref=e277]: Which client should this project belong to? (optional)
      - generic [ref=e278]: Acme Encore
      - generic [ref=e279]: Project name?
      - generic [ref=e280]: E2E Project 33515
      - generic [ref=e281]: Goal, scope, and deliverables?
      - generic [ref=e282]: Full-stack web app, user auth, dashboard, REST API, deployment on Vercel
      - generic [ref=e283]: What stage?
      - generic [ref=e284]: Planning
      - generic [ref=e285]: Start and due date? (optional)
      - generic [ref=e286]: starts next Monday, due in 6 weeks
      - generic [ref=e288]:
        - generic [ref=e289]:
          - paragraph [ref=e290]: Project created
          - paragraph [ref=e291]: E2E Project 33515 is ready.
        - button "Open projects" [active] [ref=e292] [cursor=pointer]
    - generic [ref=e293]:
      - generic [ref=e294]:
        - textbox "Type your answer…" [ref=e295]
        - button "Send" [disabled] [ref=e296]:
          - img [ref=e297]
      - paragraph [ref=e299]: Powered by Qwen · Stackivo AI
```

# Test source

```ts
  1  | /**
  2  |  * Ask AI — project creation workflow E2E test.
  3  |  *
  4  |  * Required env:
  5  |  *   E2E_USER_EMAIL      -- non-admin user email
  6  |  *   E2E_USER_PASSWORD   -- its password
  7  |  *   E2E_AI_CLIENT_NAME  -- (optional) client name to link the project to
  8  |  */
  9  | 
  10 | import { test, expect } from "@playwright/test";
  11 | import { loginUser, openAiPanel, raceVisible, aiInput, aiSubmit } from "./helpers";
  12 | 
  13 | const USER_EMAIL = process.env.E2E_USER_EMAIL;
  14 | const USER_PASSWORD = process.env.E2E_USER_PASSWORD;
  15 | const CLIENT_NAME = process.env.E2E_AI_CLIENT_NAME ?? "";
  16 | const HAS_CREDS = Boolean(USER_EMAIL && USER_PASSWORD);
  17 | 
  18 | const UNIQUE_SUFFIX = Date.now().toString().slice(-5);
  19 | const TEST_PROJECT_NAME = `E2E Project ${UNIQUE_SUFFIX}`;
  20 | 
  21 | test.describe("Ask AI project flow", () => {
  22 |   test.skip(!HAS_CREDS, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run Ask AI project tests.");
  23 | 
  24 |   test("creates a project record from chat", async ({ page }) => {
  25 |     test.setTimeout(90_000);
  26 | 
  27 |     await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
  28 |     await openAiPanel(page);
  29 |     await page.getByRole("button", { name: "Add project" }).click();
  30 | 
  31 |     const input = aiInput(page);
  32 | 
  33 |     // Step 1 — client (optional)
  34 |     await expect(page.getByText(/Which client.*project/i).first()).toBeVisible({ timeout: 8_000 });
  35 |     if (CLIENT_NAME) {
  36 |       const sel = page.locator("select").first();
  37 |       if (await sel.isVisible().catch(() => false)) {
  38 |         await sel.selectOption({ label: CLIENT_NAME }).catch(() => {});
  39 |       }
  40 |     }
  41 |     await aiSubmit(page, CLIENT_NAME || "skip");
  42 | 
  43 |     // Step 2 — project name
  44 |     await expect(page.getByText("Project name?").first()).toBeVisible({ timeout: 8_000 });
  45 |     await aiSubmit(page, TEST_PROJECT_NAME);
  46 | 
  47 |     // Step 3 — scope
  48 |     await expect(page.getByText(/Goal.*scope/i).first()).toBeVisible({ timeout: 8_000 });
  49 |     await aiSubmit(page, "Full-stack web app, user auth, dashboard, REST API, deployment on Vercel");
  50 | 
  51 |     // Step 4 — status (choice chip): click chip, then submit
  52 |     await expect(page.getByText("What stage?").first()).toBeVisible({ timeout: 8_000 });
  53 |     await page.getByRole("button", { name: "Planning" }).click();
  54 |     await aiSubmit(page); // submits chip value
  55 | 
  56 |     // Step 5 — dates (optional)
  57 |     await expect(page.getByText(/Start and due date/i).first()).toBeVisible({ timeout: 8_000 });
  58 |     await aiSubmit(page, "starts next Monday, due in 6 weeks");
  59 | 
  60 |     const result = await raceVisible(page, ["Project created", "Could not", "Tell me about the project"], 45_000);
  61 |     if (result.includes("Could not") || result.includes("Tell me")) {
  62 |       throw new Error(`Project creation failed: "${result}"`);
  63 |     }
  64 | 
  65 |     await expect(page.getByText("Project created")).toBeVisible();
  66 |     await page.getByRole("button", { name: "Open projects" }).click();
> 67 |     await page.waitForURL((url) => url.pathname.startsWith("/dashboard/projects"), { timeout: 10_000 });
     |                ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  68 |   });
  69 | 
  70 |   test("creates a project via free-form prompt in general mode", async ({ page }) => {
  71 |     test.setTimeout(90_000);
  72 | 
  73 |     await loginUser(page, USER_EMAIL!, USER_PASSWORD!);
  74 |     await openAiPanel(page);
  75 | 
  76 |     await aiSubmit(page, `Create a new project called "Branding Refresh ${UNIQUE_SUFFIX}", active status, 4-week timeline`);
  77 | 
  78 |     await expect(page.getByText(/Branding Refresh/i).first()).toBeVisible({ timeout: 10_000 });
  79 | 
  80 |     const result = await raceVisible(page, ["Project created", "Could not", "Project name"], 45_000);
  81 |     if (result.includes("Could not")) {
  82 |       throw new Error(`Free-form project creation failed: "${result}"`);
  83 |     }
  84 | 
  85 |     const assistantMessages = page.locator(".mr-auto.bg-muted\\/60");
  86 |     expect(await assistantMessages.count()).toBeGreaterThan(1);
  87 |   });
  88 | });
  89 | 
```