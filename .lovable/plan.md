# Stackivo — Marketing Site + Auth Redesign

## Repo reality check
The repo currently contains only `src/routes/__root.tsx` and a placeholder `src/routes/index.tsx`. There are no existing marketing pages, auth pages, dashboard, CRM, or backend code in this project. So this pass **builds the in-scope pages from scratch** under one cohesive design language. Nothing out of scope (dashboard, CRM, AI workspace, backend, real auth) is touched or created.

## Design language
- **Aesthetic**: Linear / Attio / Vercel tier — confident, intelligent, restrained. Light theme by default with proper dark mode.
- **Palette** (oklch in `src/styles.css`):
  - Background: near-white warm `oklch(0.992 0.003 100)`
  - Foreground: near-black `oklch(0.18 0.02 265)`
  - Brand accent: deep electric indigo `oklch(0.52 0.22 269)`
  - Surfaces + borders tuned for crisp separation; dark mode mirrors.
- **Typography**: Display = Geist (fallback Inter), Body = Inter, Mono = JetBrains Mono. Tight tracking on headlines, generous line-height on body.
- **Motion**: `framer-motion` — scroll reveals, staggered entrances, subtle parallax on hero, hover lifts on cards. No particles, no glow spam.
- **Mobile-first**: designed at 375px first. ≥44px tap targets. Sticky condensed nav → `Sheet` drawer on mobile. No CLS.

## Routes (TanStack file-based, each with unique `head()` SEO)
```
src/routes/
  __root.tsx           (refresh: site SEO defaults, fonts link, providers preserved)
  index.tsx            Landing
  features.tsx         Features deep-dive
  pricing.tsx          Plans + comparison
  integrations.tsx     Integration catalog
  contact.tsx          Sales / contact
  login.tsx            Sign in
  signup.tsx           Create workspace
  forgot-password.tsx  Recovery
```

## Page outlines

**Landing (`/`)**
1. Glass sticky nav (logo, Features, Pricing, Integrations, Contact, Sign in, "Create Workspace")
2. Hero — H1 "Run your entire business from one workspace." + sub + dual CTA + animated product mock (SVG composition of sidebar + kanban + doc tabs)
3. Logo strip (placeholder customer marks)
4. "Built for" segmented showcase (Freelancers · Consultants · Agencies · Startups · Businesses)
5. Pillars grid: Clients, Projects, Tasks, Documents, Team, Automations, AI Workflows
6. Scroll-pinned product walkthrough — three annotated UI vignettes
7. Automations / AI flow visualization (node-graph SVG)
8. Testimonials (3, restrained)
9. Pricing teaser → `/pricing`
10. FAQ accordion
11. Final CTA band
12. Footer

**Features** — alternating zigzag deep-dives for each pillar, animated UI vignettes.
**Pricing** — 3 tiers (Starter / Team / Business), monthly/annual toggle, comparison table, FAQ.
**Integrations** — searchable grid by category (Comms, Storage, Calendar, Dev, Payments, AI), category chips.
**Contact** — split layout: form (name, work email, company, team size, message) + sales info + demo CTA. Presentation-only (toast on submit).
**Auth pages** — split layout: form card on the left, brand panel with product visual on the right; stacks on mobile. `react-hook-form` + `zod`, submit shows a toast — no auth logic wired.

## Shared components (new — under `src/components/site/`)
`SiteHeader`, `SiteFooter`, `Container`, `SectionHeading`, `Logo`, `ProductMock`, `FeatureCard`, `PricingCard`, `IntegrationCard`, `FAQ`, `CTASection`, `AuthLayout`, `LogoCloud`.

## Tech notes
- Add `framer-motion`.
- Load Geist + Inter + JetBrains Mono via Google Fonts `<link>` in `__root.tsx` head.
- Rewrite `src/styles.css` tokens for the new palette (light + dark) — preserves all existing variable names so shadcn primitives keep working.
- Use existing shadcn primitives (Button, Card, Input, Accordion, Sheet, Tabs, Dialog, Toast).
- Visuals are SVG/HTML/CSS compositions — **no stock imagery**. Optional: one premium `imagegen` hero mock if needed.
- Strict TS; every `createFileRoute("/...")` matches its filename. Each route defines its own `head()` (title, description, og:title, og:description; og:image only at leaf routes if generated).

## Explicitly out of scope (this pass)
Backend, real auth, dashboard, CRM, AI workspace, billing, integrations runtime, route protection. Auth pages are visual only.
