# Stackivo

A premium business operating system for freelancers — manage clients, invoices, contracts, projects, files, payments, and analytics in one unified workspace.

> **Status:** Frontend foundation only. Backend, Supabase integration, and business logic are intentionally out of scope for this scaffold.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript (strict)
- **Styling:** Tailwind CSS 3.4 + CSS variables for theming
- **Components:** shadcn/ui (new-york style) + Radix UI primitives
- **Icons:** Lucide React
- **Theming:** `next-themes` (light / dark / system)
- **Toasts:** Sonner
- **Fonts:** Inter (sans) + JetBrains Mono (mono) via `next/font`

## Getting Started

```bash
# install dependencies
npm install

# start the dev server
npm run dev

# open http://localhost:3000
```

Routes available:

- `/` — landing page
- `/login`, `/signup` — auth screens
- `/dashboard` — main dashboard shell
- `/dashboard/{clients,projects,invoices,contracts,portal,time,pulse,settings}`

## Project Structure

```
src/
├── app/                       # Next.js App Router
│   ├── (auth)/                # auth route group (login, signup)
│   ├── (dashboard)/           # dashboard route group with shell layout
│   │   └── dashboard/         # all /dashboard/* pages
│   ├── globals.css            # Tailwind + CSS variables (light/dark tokens)
│   ├── layout.tsx             # root layout: fonts + providers
│   ├── loading.tsx            # global loading boundary
│   ├── error.tsx              # global error boundary
│   ├── not-found.tsx          # 404
│   └── page.tsx               # landing
├── components/
│   ├── ui/                    # shadcn primitives (button, card, input, …)
│   ├── shared/                # reusable cross-feature UI (empty-state, skeletons, kpi, …)
│   ├── layout/                # app shell (sidebar, top-nav, mobile drawer, user menu)
│   └── providers/             # theme + toast + tooltip providers
├── features/                  # feature modules (auth, invoices, clients, …) — logic co-located
├── hooks/                     # reusable hooks (use-mobile, …)
├── lib/                       # app-wide helpers (cn, formatters)
├── services/                  # external service clients (Supabase, Razorpay, Brevo)
├── stores/                    # Zustand global stores
├── types/                     # shared TS types
├── schemas/                   # Zod schemas
├── constants/                 # static config (navigation, …)
├── config/                    # site config
└── utils/                     # pure helpers
```

## Design System

- **Primary color:** Blue (tuned per mode) exposed as `--primary` HSL variable.
- **Semantic tokens:** `background`, `foreground`, `card`, `muted`, `accent`, `destructive`, `success`, `warning`, `border`, `input`, `ring`, plus `sidebar-*`.
- **Radius:** `--radius` = `0.5rem`, mapped to Tailwind's `rounded-lg/md/sm`.
- **Inspiration:** Linear · Vercel Dashboard · Stripe Dashboard · Notion.

## Global UX Primitives

Every page has access to:

- `PageHeader` — title, description, actions slot
- `EmptyState` — icon + title + description + optional CTA
- `PageSkeleton` / `TableSkeleton` / `CardSkeleton` — loading states
- `KpiCard` — dashboard metric cards
- `Section` — titled section wrapper
- `Toaster` (Sonner) — call `toast.success()` / `toast.error()` anywhere
- `ThemeToggle` — light / dark / system

## Layout Architecture

- **Persistent sidebar** on `md+` with collapse toggle (`240px` ↔ `60px`).
- **Drawer navigation** (Radix Sheet) on mobile, opened from the top bar.
- **Sticky top nav** with global search, notifications, theme toggle, and user menu.
- **Route groups:** `(auth)` gets a centered minimal card layout; `(dashboard)` gets the full shell.

## Scripts

```bash
npm run dev          # next dev
npm run build        # next build
npm run start        # next start
npm run lint         # next lint
npm run type-check   # tsc --noEmit
```

## Environment Variables

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Stackivo
```

## Not Included (by design)

- Backend, APIs, database wiring
- Supabase client setup
- Payment, email, or auth business logic

These will be added in subsequent phases per the implementation document suite in `docs/product/`.
