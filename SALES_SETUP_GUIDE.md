# Stackivo — Sales, Marketing & Conversion Setup Guide

> Companion to `ADMIN_CONSOLE_SETUP.md` and `SUPPORT_SYSTEM_SETUP.md`. The codebase wiring is done; this guide walks you through every **vendor account creation, content edit, and configuration step** needed to activate the marketing + conversion + sales stack in one sitting.
>
> **Time required:** 2–3 hours total. You can stop after Step 1 (Microsoft Clarity) and have meaningful conversion analytics; everything else is incremental.
>
> **Cost:** ₹0/month with the recommended stack until ~$50k ARR.

---

## What's already wired in code

Every integration is **env-gated** — the site renders cleanly with zero env vars set. Each setup step below adds one more capability.

| Capability | File(s) | Behaviour without setup |
| --- | --- | --- |
| **Microsoft Clarity** (heatmaps + replay) | `@/src/lib/analytics/clarity-provider.tsx` | Script not loaded |
| **Cal.com booking** at `/talk` | `@/src/app/(marketing)/talk/page.tsx` | Renders honest "coming soon" stub |
| **Loom demo** at `/demo` | `@/src/app/(marketing)/demo/page.tsx` | Renders placeholder + signup CTA |
| **Newsletter capture** (footer + exit-intent) | `@/src/features/leads/actions.ts` | Leads still emailed to founder; Brevo skip |
| **Marketing funnel events** | `@/src/components/marketing/global-cta-tracker.tsx` + `@/src/lib/analytics/events.ts` | Always wired (no-ops if PostHog unset) |
| **Crisp on marketing** | `@/src/app/(marketing)/layout.tsx` | Already shipped from support guide |
| **Sticky mobile CTA** | `@/src/components/marketing/sticky-mobile-cta.tsx` | Always renders for anon visitors |
| **Pricing risk-reversal strip** | `@/src/components/marketing/guarantee-strip.tsx` | Always renders |
| **Competitor comparison** | `@/src/components/marketing/competitor-comparison.tsx` | Always renders |
| **Founder note block** | `@/src/components/marketing/founder-note.tsx` | Always renders |
| **/about /contact /talk /demo /security /changelog /terms /privacy** | `@/src/app/(marketing)/...` | Always renders |
| **Pricing FAQ (objection-led)** | `@/src/app/(marketing)/pricing/page.tsx` | Always renders |
| **Exit-intent modal** | `@/src/components/marketing/exit-intent-modal.tsx` | Always armed (desktop ≥768px, once per 30 days per visitor) |

> **Everything below is configuration-only.** No further code changes are required.

---

## Step 0 — Sanity check

Run a tsc + lint pass after pulling the latest code, just to confirm your environment is consistent:

```bash
npx tsc --noEmit
npx eslint src
```

Both should exit clean. If they don't, fix those first before changing any vendor configuration.

Then walk every public page once in production mode:

```bash
npm run build && npm run start
```

Visit `/`, `/pricing`, `/about`, `/contact`, `/talk`, `/demo`, `/security`, `/changelog`, `/terms`, `/privacy`. None should 404.

---

## Step 1 — Microsoft Clarity heatmaps + replay (≈ 5 min)

Free, unlimited heatmaps + click + scroll + session replay. The single highest-leverage analytics tool on this list.

1. Go to **https://clarity.microsoft.com/** → sign in with a personal Microsoft account.
2. **Add new project**:
   - Name: `Stackivo`
   - Website URL: `https://stackivo.me`
   - Category: `Other`
3. Skip the "Install Clarity" tab — we don't paste the snippet manually.
4. **Settings → Setup** → copy the project id (looks like `abcd1234ef`).
5. In Vercel + local: set `NEXT_PUBLIC_CLARITY_PROJECT_ID=<that id>`. Redeploy.

Verify: visit `/`, open devtools → Network → filter `clarity.ms`. You should see the loader fire. Within ~30 minutes the Clarity dashboard shows your first sessions.

### Clarity polish (5 more minutes)

| Setting | Value | Why |
| --- | --- | --- |
| **Settings → Masking** → Sensitive data | `Mask` | Default. Hides input contents in replays. |
| **Settings → Masking** → Add custom selector `[data-clarity-mask]` | Mask | Lets you opt extra elements into masking |
| **Settings → IP exclusion** | Your home IP | So your own browsing doesn't pollute heatmaps |
| **Settings → Filters** → Save filter "Mobile · pricing visitors" | path = `/pricing` AND device = `Mobile` | Quick-access for the most-watched cohort |

---

## Step 2 — PostHog funnel + replay (≈ 25 min)

You already have PostHog wired. This step turns it into a usable funnel + replay setup.

### 2a. Create the funnel (Insights → New → Funnel)

Wire these steps in order (they all already fire from the code):

1. `$pageview` (path = `/`) — landing
2. `$pageview` (path = `/pricing`) — pricing
3. `marketing.cta.clicked` (location contains `_primary`) — primary intent
4. `auth.user.signed_up` — signup
5. `onboarding.flow.completed` — activated

Save as **Activation Funnel**. Pin to the home dashboard.

### 2b. Enable session replay

PostHog → **Project settings → Session recording → Enable**. Set sampling **100% during the first 100 signups**, then drop to 25%.

### 2c. Configure feature flags for A/B testing

PostHog → **Feature flags → New flag**:

| Flag key | Variants | Purpose |
| --- | --- | --- |
| `hero_h1_test` | `control`, `outcome_led`, `transformation_led` | A/B the hero copy |
| `pricing_default_billing` | `monthly`, `yearly` | Test default toggle position |
| `pro_trial` | `none`, `14d_pro` | Auto-trial gate (when you wire it later) |

PostHog will auto-distribute traffic. Read with `usePostHog()` (already wired) when you want to gate copy.

### 2d. PostHog Insights to pin

Pin these to the home dashboard:

1. **Activation Funnel** (above)
2. **Most-clicked CTA** — Trends → `marketing.cta.clicked` → break down by `location`
3. **Most-opened FAQ** — Trends → `marketing.faq.opened` → break down by `question`
4. **Pricing toggle preference** — Trends → `marketing.pricing.toggle_changed` → break down by `billing`
5. **Lead source quality** — Trends → `marketing.lead.captured` → break down by `source`
6. **Exit-intent shown vs captured** — Pie chart of `marketing.exit_intent.shown` (denominator) ÷ `marketing.lead.captured` where source = `exit_intent` (numerator)

Total setup time: 20 minutes. Payoff: every product decision becomes data-grounded.

---

## Step 3 — Cal.com founder-call booking (≈ 15 min)

The `/talk` page renders a Cal.com iframe when configured.

1. Go to **https://cal.com/** → sign up with `founder@stackivo.me` (or your preferred email).
2. **Choose handle:** something short and human, e.g. `stackivo` or `jaksh`.
3. **Skip Cal.com Pro** — the free tier handles single-event-type bookings, embeds, and unlimited bookings.
4. **Connect a calendar:** Google Calendar (most common). Cal.com checks your availability + writes events back.
5. **Create event type:**
   - Name: `Stackivo founder chat`
   - Slug: `founder-chat`
   - Duration: 30 minutes
   - Buffer time: 5 min before, 5 min after
   - Location: Google Meet (auto-generated link)
   - Booking questions: **Email**, **What brings you here today? (textarea)**
   - Confirmation: enabled
   - Reminders: 24h before + 1h before
6. **Working hours:** match your timezone (Asia/Kolkata) and waking hours. **Don't expose 3 AM IST slots** — visitors will book and you'll resent it.
7. **Embed URL:** Cal.com → your event type → **Share** → copy the **direct booking URL** (e.g. `https://cal.com/stackivo/founder-chat`). Use the *direct* URL, not the iframe-helper URL — the embed at `/talk` handles that.
8. Set in Vercel + local:
   ```
   NEXT_PUBLIC_CAL_COM_URL=https://cal.com/stackivo/founder-chat
   ```
9. Redeploy. `/talk` now renders the live calendar.

### Cal.com polish

- **Settings → Branding → Custom logo:** upload Stackivo logo so the iframe carries the brand.
- **Settings → Notifications:** enable "Notify on booking" via Slack / email so you don't miss a slot.
- **Workflows → Add workflow:** auto-send a Loom intro 24h before the call.

### Cal.com mobile app

Install on your phone — push notifications for new bookings. Free.

---

## Step 4 — Loom demo video (≈ 30 min recording + setup)

The `/demo` page renders a Loom embed when configured.

1. Sign up at **https://www.loom.com/** (free tier, 25 video limit, 5-min cap).
2. Install the Loom desktop app or browser extension.
3. **Record the script** (90 seconds, no edit):
   - Land on `stackivo.me` → click "Start free" → enter your test email.
   - Show the dashboard in 5 seconds.
   - Add a client (10 seconds).
   - Create + send a GST invoice (30 seconds).
   - Open Pulse (10 seconds).
   - Cut to a quiet "calm dashboard" closing shot.
4. After recording, Loom gives you two URLs:
   - `https://www.loom.com/share/<id>` — human page
   - `https://www.loom.com/embed/<id>` — iframe-friendly

   Use the **embed URL**.
5. Set in Vercel + local:
   ```
   NEXT_PUBLIC_LOOM_DEMO_URL=https://www.loom.com/embed/<id>
   ```
6. Redeploy. `/demo` now renders the live video.

### Recording tips

- **Hide your tabs and bookmarks bar.** Visitors notice.
- **Use a 1280×720 window**, not full-screen — keeps the video readable on mobile.
- **No edit** — the video should feel real-time. If you fumble, re-record. Loom encourages re-takes.
- **Voiceover beats text overlays.** Stockholm-quiet voice + a calm pace converts better than hype.
- **End with the URL spoken** — "go to stackivo.me to start free."

---

## Step 5 — Brevo newsletter list + welcome automation (≈ 20 min)

Footer + exit-intent forms POST through `subscribeToNewsletterAction()`. Brevo holds the list.

### 5a. Create the list

1. Brevo dashboard → **Contacts → Lists → Create new list**:
   - Name: `Newsletter — Stackivo`
   - Description: `Inbound subscribers from marketing site (footer + exit intent)`
2. Copy the **list id** from the URL: `/list/<id>`.
3. In Vercel + local: `BREVO_NEWSLETTER_LIST_ID=<that id>`. Redeploy.

### 5b. Add custom contact attributes

Brevo → **Contacts → Settings → Contact attributes → Create**:

| Attribute | Type | Used by |
| --- | --- | --- |
| `LEAD_SOURCE` | Text | Records "footer" / "exit_intent" / "banner" |
| `LEAD_MAGNET` | Text | Records the gated magnet (e.g. `gst_template`) |
| `SUBSCRIBED_AT` | Date | Captured automatically |

The leads action sends these attributes through; Brevo will create them on first contact even if you skip this step, but it's cleaner to declare them upfront.

### 5c. Welcome email automation

Brevo → **Automation → Create scenario**:

- **Trigger:** Contact added to "Newsletter — Stackivo" list
- **Wait:** 30 seconds (avoids "instant email" spam-flag)
- **Send email:**
  - Subject: `Welcome to Stackivo (and your free GST invoice template)`
  - Sender: `hello@stackivo.me`
  - Body: 1-paragraph intro + 1-line founder voice + the magnet attachment (if `LEAD_MAGNET = gst_template`)
- **Wait:** 24h
- **If they still haven't signed up** (Brevo has no native "checked-in to product" signal — handle in PostHog), send a soft nudge.

### 5d. Verify the form path

1. Set vars + redeploy.
2. Visit `/` → scroll to footer → enter a test email → submit.
3. You should see "Subscribed."
4. Brevo → **Contacts → Newsletter** → the email is in the list with `LEAD_SOURCE=footer`.

### 5e. (Optional) Build the GST invoice template magnet

Used by the exit-intent modal (`magnet=gst_template`).

1. Build a CA-approved Excel template (single sheet, formulas for CGST/SGST/IGST split based on a dropdown, footer with notes, blank PDF preview tab).
2. Upload to Supabase storage in a public bucket: `gs://stackivo-public/lead-magnets/gst-invoice-template.xlsx`.
3. Reference the public URL inside the welcome email automation in step 5c.

---

## Step 6 — UTM hygiene + attribution (≈ 10 min)

PostHog auto-captures UTMs as event properties. Set the convention and your future ad / SEO / partnership campaigns can be properly attributed:

| UTM | Convention | Examples |
| --- | --- | --- |
| `utm_source` | The vendor / channel | `twitter`, `linkedin`, `google`, `producthunt` |
| `utm_medium` | Type of placement | `social`, `cpc`, `email`, `referral` |
| `utm_campaign` | Campaign name (snake-case) | `gst_filing_season_2026`, `freelancers_unite` |
| `utm_content` | Specific creative / variant | `hero_blue_cta`, `dm_template_a` |
| `utm_term` | (CPC only) the keyword | `gst+invoice+software` |

Build a tiny **UTM builder bookmarklet** (any free tool) so you don't typo URLs.

PostHog → **Insights → New → Trends** → `$pageview` → break down by `utm_source` to see source quality.

---

## Step 7 — Top announcement banner (optional, ≈ 30 min — not yet wired)

Not wired in code yet. When you have a campaign worth banner-ing (a launch, a discount, a press feature), build a small `<TopBanner/>` component:

- Mount in `@/src/app/(marketing)/layout.tsx` above `<MarketingHeader/>`.
- Dismissible (localStorage flag, like exit-intent).
- Single CTA, single message.
- Track via `marketing.cta.clicked` with `location=banner`.

We're skipping it for v1 because *constant* banners ("Black Friday → Cyber Monday → New Year") destroy trust. Ship banners only when there's something worth announcing.

---

## Step 8 — Founder presence finalisation (≈ 30 min — content, no code)

The codebase ships with a **generic team voice** on `/about` and `<FounderNote/>` — by your choice. When you're ready to personalise:

### Edits required

| File | What to change | Why |
| --- | --- | --- |
| `@/src/app/(marketing)/about/page.tsx` | Replace "We" voice with first-person founder voice. Add a founder photo. Mention your background in 2 sentences. Link Twitter / LinkedIn. | Lifts conversion 15-30% on solo SaaS |
| `@/src/components/marketing/founder-note.tsx` | Same. Replace "the team" with your name. Add `<Image src="/founder.jpg" />` (place a 240×240 photo in `/public/`). | Same |
| `@/src/components/marketing/testimonials-section.tsx` | Replace the "Building in public" placeholder with 3 real testimonials when you have them. Each must have: photo, full name, role, **LinkedIn or Twitter link verifying the person is real**. | Real testimonials with verifiable links lift conversion 20-40%. Fakes hurt. |

### Founder photo recipe

1. Plain background or a real workspace shot.
2. Smile + eye contact.
3. Square crop, 480×480 minimum.
4. Save as `public/founder.jpg`. Use `next/image` at 96×96 → 240×240.

---

## Step 9 — Blog content (≈ ongoing)

The blog ships with **5 SEO-targeted posts** live at `/blog`. Posts live as TypeScript modules in `@/src/features/blog/posts.tsx`. To add a new one, append to the `POSTS` array.

### Posts shipping today

| Slug | Target search | Words | Category |
| --- | --- | --- | --- |
| `/blog/gst-invoice-format-for-freelancers-india` | "gst invoice format freelancer" | ~750 | GST & Tax |
| `/blog/how-to-set-your-freelance-rate-india` | "freelance hourly rate india" | ~800 | Pricing |
| `/blog/freelance-contract-essentials-india` | "freelance contract template india" | ~700 | Contracts |
| `/blog/freelancer-income-tax-india-guide` | "freelancer income tax india", "44ADA presumptive" | ~850 | GST & Tax |
| `/blog/stop-late-paying-clients-india-msme` | "msme overdue invoice", "late payment freelancer" | ~750 | Money & Cashflow |

Each post ends with an explicit CTA to either `/signup` or one of the free `/tools/*` calculators — that's the primary conversion path.

### What you need to do

1. **Read each post** end-to-end. Replace any phrasing that doesn't sound like your voice.
2. **Replace the founder voice** on `/about` and the founder note before linking these posts to Twitter / LinkedIn / Hacker News. The blog reinforces the founder presence; impersonal copy on `/about` would feel inconsistent.
3. **Submit `/feed.xml`** to feedly + your existing newsletter subscribers' RSS readers if you maintain a public profile.

### Adding new posts

Open `@/src/features/blog/posts.tsx` and append a `BlogPost`-typed object to the `POSTS` array. Required fields: `slug`, `title`, `description`, `publishedAt`, `category`, `readingMinutes`, `body` (JSX). The post automatically:

- Renders at `/blog/<slug>` (statically generated).
- Joins the `/blog` index sorted by `publishedAt`.
- Appears in `sitemap.xml` and `feed.xml`.
- Inherits the `<ProsePage/>` chrome + closing CTA + newsletter capture.

### Editorial cadence target

- **One post every 3 weeks** for the first 6 months.
- Each post should answer a search query you've actually heard from prospects (PostHog FAQ events are a great source — surface `marketing.faq.opened` and look for repeats).
- 600–900 words is the sweet spot. Longer posts don't rank meaningfully better on these keywords; they cost you authoring discipline.

### Lead magnet upgrade path

Posts currently push to signup / calculators. The natural next move is per-post lead magnets (Excel templates, PDF cheat sheets) gated behind `subscribeToNewsletterAction({ magnet: "<slug>" })`. The Brevo automation in Step 5c is ready — just attach the file URL to the welcome email when `LEAD_MAGNET = <slug>`.

---

## Step 9b — Free tools / calculators (≈ ongoing, mostly hands-off)

Three free calculators ship live:

| URL | What it does |
| --- | --- |
| `/tools/freelance-rate-calculator` | Reverse-engineers minimum hourly rate from target income |
| `/tools/gst-calculator` | CGST/SGST or IGST split for any amount + rate + place of supply |
| `/tools/late-payment-interest-calculator` | Interest accrual on overdue invoices, MSMED §16-aware |

### Operational notes

- **The math is pure-function.** No DB, no auth, no server roundtrip beyond the initial page load.
- **Each tool ends with a `<ToolFooter/>`** that links to `/signup` + newsletter capture. Conversion path lives there.
- **Analytics: `marketing.cta.clicked` with `location=tool_<slug>_signup`** fires when the user clicks through. Build a PostHog funnel: tool view → CTA click → signup → activation.
- **Maintain the math** when external rules change. The GST calculator is the most likely to need updates — if the government adds a new slab or changes the place-of-supply rules, update `@/src/features/tools/gst-calculator.tsx`. The 18% MSMED rate in the late-payment calculator is contractual default; expose it via `rate` slider so users can match their own contracts.
- **Adding a new calculator:**
  1. Add a `ToolMeta` entry to `TOOLS` in `@/src/features/tools/types.ts`.
  2. Create the client-side calculator at `@/src/features/tools/<slug>-calculator.tsx`.
  3. Create the page wrapper at `@/src/app/(marketing)/tools/<slug>/page.tsx` (5-line template — copy from any existing).
  4. Add to sitemap + footer (already auto-discovered through `TOOLS`).

### SEO note

Calculator pages are typically thin on copy. To rank, each one should grow a 250–400 word explainer below the calculator over time — "what this calculator does, who it&rsquo;s for, common mistakes". That copy is what Google indexes.

---

## Step 9c — The new 2-step onboarding flow

The onboarding flow was rewritten from **5 gated steps → 2 gated steps**. The old steps (invoice prefs, signature, first client) became a **dashboard setup checklist** (`@/src/components/dashboard/setup-checklist.tsx`).

### What changed

| Old flow | New flow |
| --- | --- |
| business → gst → invoice → signature → first_client → done | business → gst → done |
| ~38% of signups stalled mid-flow | Target: ~5% drop-off |
| 5 mandatory writes to user_profiles | 2 mandatory writes |

### Backwards compatibility

Existing users mid-flight at `invoice`/`signature`/`first_client` step keep their saved step value and continue through the old flow pages. Only NEW users hit the new short flow. Zero data migration needed.

### Where the skipped steps live now

| Old gated step | New surface |
| --- | --- |
| Invoice preferences | `/dashboard/settings/invoice` (linked from setup checklist) |
| Signature | `/dashboard/settings/branding` (linked from setup checklist) |
| First client | `/dashboard/clients/new` (linked from setup checklist) |

### Setup checklist behaviour

- Renders only when at least one item is pending (objectively detectable for signature + first client; localStorage-flagged for invoice prefs after the user visits the settings page).
- Dismissable via the X button — persists to localStorage. After dismissal it never reappears for that browser.
- **No DB migration needed.** Pure client-side detection on top of fields already in `user_profiles`.

### Tracking

Server-side event `onboarding.flow.completed` fires on the GST step submission with `flow_version=v2_short, step_count=2`. Build a PostHog funnel:

1. `auth.user.signed_up`
2. `onboarding.flow.completed` filter `flow_version=v2_short`
3. `client.created`
4. `invoice.created`
5. `invoice.sent`
6. `invoice.paid`

The first three steps are activation; 4–6 are revenue-activation. Watch the v2_short conversion against historical (PostHog → break down `onboarding.flow.completed` by `flow_version`).

### If you want to roll back

The old code path is intact. Just change `advanceStep(userId, "done", patch)` to `advanceStep(userId, "invoice", patch)` and the redirect to `pathForStep("invoice")` in `@/src/features/onboarding/actions.ts` `saveGstStep`. That single edit reverts to the 5-step flow. Keep this option open until you have 2 weeks of v2_short funnel data.

---

## Step 10 — Mobile + accessibility verification

Run through every page on a real iPhone + Android phone:

- [ ] Hero CTA tappable (≥ 44px target)
- [ ] Sticky mobile CTA appears after scrolling past the hero
- [ ] Sticky CTA does not collide with the floating support buoy
- [ ] Mobile sheet menu works smoothly
- [ ] Pricing toggle (monthly/yearly) is tappable on mobile
- [ ] FAQ accordion expand / collapse smooth on mobile
- [ ] Exit-intent modal does NOT show on mobile (intentional)
- [ ] /talk Cal.com iframe scrolls correctly on mobile
- [ ] /demo Loom iframe responsive

Run a Lighthouse audit on `/` and `/pricing` from devtools (mobile profile):
- LCP target: < 2.5s
- CLS target: < 0.1
- INP target: < 200ms
- Accessibility: ≥ 95
- Best practices: ≥ 95

---

## Step 11 — Conversion content edits to consider

These are pure copy edits, no code touch needed (unless you want to A/B them):

### Hero copy alternatives to test

| Variant | H1 | Sub |
| --- | --- | --- |
| **Outcome-led (control)** | GST invoicing + everything else your freelance business needs | One workspace for clients, contracts, time tracking and revenue analytics. Free forever for the first 5 clients. |
| **Specific-led** | Free GST invoices, contracts, and revenue tracking for Indian freelancers | Stop juggling 5 tools. One ₹0 workspace handles every part of your one-person business. |
| **Pain-led** | Stop juggling 5 tools to send a single GST invoice | Stackivo replaces your invoicing app, contract tool, time tracker, and revenue spreadsheet. Free forever for 5 clients. |

A/B via PostHog flag `hero_h1_test`.

### Trust strip alternatives

The hero shows three trust items. Strongest combinations:
- `🇮🇳 Mumbai-hosted` · `Daily backups` · `No card to start` (current)
- `1,000+ freelancers (private beta)` · `30-day money-back` · `Cancel anytime` (when 1k+ achieved)
- `As featured in <publication>` · `Daily backups` · `Free forever` (when press lands)

---

## Step 12 — Daily + weekly cadence

### Daily (5 min)
- PostHog → **Live events** stream → scan recent traffic.
- Brevo → new subscribers count.
- Cal.com → upcoming bookings.

### Weekly (30 min, Friday)
- PostHog → **Activation Funnel** dashboard → identify the worst-performing step. Hypothesize one fix.
- Clarity → **Recordings → Insights** → watch 3 random sessions of `/pricing` visitors who didn't convert. Note one observation.
- Loom → re-record demo if a major feature shipped this week.
- Changelog → update `@/src/app/(marketing)/changelog/page.tsx` with everything shipped this week.
- Brevo → send the weekly newsletter to the list (or fortnightly if cadence is too tight).

### Monthly (90 min, first weekend)
- Run the full audit checklist from `MARKETING_AUDIT.md` (the audit deliverable).
- A/B winner declaration: archive losing variants, promote winners.
- Compare PostHog funnel month-over-month for activation rate trend.
- Refresh the comparison table (`@/src/components/marketing/competitor-comparison.tsx`) — competitors change.

---

## Step 13 — When to upgrade (cost triggers)

Free tier carries you a long way. Hard triggers to upgrade:

| Symptom | Upgrade |
| --- | --- |
| > 1k visitors/day | PostHog stays free until 1M events/mo (~3-5k DAU). No upgrade needed. |
| > 5k Loom views/month or > 25 videos | Loom Business ($12.50/seat/mo) — unlimited videos |
| > 25 bookings/month + you want SMS reminders | Cal.com Teams ($12/seat/mo) |
| > 9k Brevo emails/month | Brevo Lite (₹620/mo) |
| > 100k Clarity sessions/month | Stays free — Clarity has no upgrade tier |

Most solo SaaS reaches none of these triggers in year 1. You're safe.

---

## Step 14 — Security / privacy notes

| Concern | Mitigation in place |
| --- | --- |
| **Newsletter consent** | Single opt-in (email submission = consent under DPDP Act). Add double-opt-in flow if you target EU GDPR users. |
| **Cookie consent banner** | Not legally required in India for first-party functional cookies. Required in EU — defer until you have substantive EU traffic. |
| **PII in PostHog events** | Our event catalogue forbids PII via the `redact` helper. Email addresses are already hashed before PostHog server-side calls. |
| **Clarity replay PII** | Inputs are masked by default. Forms with sensitive data (signup, login) are out of replay scope by browser convention. |
| **Brevo unsubscribe** | Brevo inserts the legally-required unsubscribe footer on every campaign. The transactional welcome email gets one too if you flag it as marketing. |

---

## Step 15 — Troubleshooting

### Clarity heatmaps are empty
1. Verify `NEXT_PUBLIC_CLARITY_PROJECT_ID` is set in **production**, not just preview.
2. Devtools → Network → `clarity.ms` should be 200.
3. Sessions take ~30 minutes to populate. Check after waiting.

### `/talk` shows the "coming soon" stub even though Cal.com is set up
1. Verify `NEXT_PUBLIC_CAL_COM_URL` is set on Vercel and redeployed.
2. The URL must be the **direct booking URL**, not the embed-helper URL.

### Newsletter form returns "Could not subscribe"
1. Brevo API key is required even if `BREVO_NEWSLETTER_LIST_ID` is set. Check `BREVO_API_KEY` is configured.
2. Check Vercel logs for `leads.subscribe.brevo_failed_fallback_email` — Brevo's response body is logged.
3. If 401: API key is invalid or scoped incorrectly.

### Exit-intent modal never appears
1. Resize browser to ≥ 768px wide (mobile is intentionally excluded).
2. Scroll past 30% of the page.
3. Move pointer above the address bar quickly.
4. If you previously dismissed: clear `localStorage` key `stackivo:exit_intent_dismissed`.

### Sticky mobile CTA covers content
1. The bar reserves 68px on the right for the support buoy. If you removed the buoy, the bar can be widened.
2. The bar hides on `/signup`, `/login`, `/talk`, `/demo`, `/contact` by design.

### CTA tracking events not firing
1. PostHog must be initialised — check devtools console for `posthog` global.
2. Anchors must have `data-cta="..."` attribute. Anchors without it are ignored.
3. The `<GlobalCtaTracker/>` runs only in the marketing route group. CTAs in dashboard / auth pages aren't tracked by it (use explicit `useTrack()` there).

---

## Reference: env var summary

| Var | Used by | Required for | When unset |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | client | Heatmaps + replay | Script never loads |
| `NEXT_PUBLIC_CAL_COM_URL` | `/talk` | Embedded booking calendar | Stub renders |
| `NEXT_PUBLIC_LOOM_DEMO_URL` | `/demo` | Embedded demo video | Placeholder + signup CTA |
| `BREVO_API_KEY` | server | Newsletter API call | Falls back to email-via-Brevo (founder gets lead) |
| `BREVO_NEWSLETTER_LIST_ID` | server | Adds subscribers to a Brevo list | Subscriber recorded but no list assignment |
| `NEXT_PUBLIC_POSTHOG_KEY` | already wired | Funnel + replay + flags | All events become no-ops |

---

## Cost projection

| Stage | Monthly cost |
| --- | --- |
| **Phase 1** (free tiers across the board) | **₹0** |
| **Phase 2** (≥ 25 bookings/month → Cal.com Teams ₹1,000) | **~₹1,000** |
| **Phase 3** (≥ 9k newsletter emails/month → Brevo Lite ₹620) | **~₹1,620** |
| **Phase 4** (Loom Business for video volume) | **~₹2,650** |

The free tier comfortably carries you past $50k ARR.

---

## Done

Once Steps 1 → 5 are complete:

- ✅ Conversion analytics: heatmaps + replay + funnel + a/b primitive.
- ✅ Trust architecture: founder voice, India-specific signals, working contact + booking, security page, real changelog.
- ✅ Lead capture: footer newsletter + exit-intent + Brevo welcome flow.
- ✅ Sales surfaces: live chat, calendar booking, video demo, contact form.
- ✅ Mobile: sticky CTA, optimised hero, accessible navigation.
- ✅ SEO: complete sitemap, JSON-LD on `/`, canonical URLs, OG metadata.
- ✅ Total monthly cost: **₹0**.

You're done. Ship it.

---

## What's still NOT in this guide (deferred by choice)

Two items remain consciously deferred:

| Item | Why deferred |
| --- | --- |
| **14-day Pro auto-trial on signup** | Touches the subscription state machine + Razorpay flow. Founder decision: keep "free forever for 5 clients" as the differentiator. Revisit only if activation funnel shows free-tier users never upgrading. |
| **Video testimonials** | Wait until at least 50 paying customers. A weak testimonial reel hurts more than no testimonials. |

Everything else from the original audit is shipped: blog (5 posts + RSS), free tools (3 calculators), short onboarding + dashboard checklist, PWA prompt gating, hero rewrite, founder note, sticky mobile CTA, exit-intent modal, lead capture, guarantee strip, competitor comparison, pricing-specific FAQ, /talk, /demo, /security, /changelog, /about, /contact, /terms, /privacy, marketing analytics events, Clarity/Brevo/Cal.com/Loom env wiring.

When you're ready to tackle either deferred item, ping me — I'll plan and ship.
