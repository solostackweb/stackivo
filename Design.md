STITCH MASTER UI GENERATION FILE

## Product Context

Stackivo is a modern SaaS platform for freelancers and solo professionals.

It is NOT a marketplace.

It is a unified business operating system where freelancers manage:
- clients
- invoices
- contracts
- projects
- files
- payments
- analytics

The UI should feel:
- modern
- premium
- minimal
- highly usable
- mobile-first
- professional

Design inspiration:
- Linear
- Vercel Dashboard
- Notion
- Stripe Dashboard

---

## UI Style Requirements

Stack:
- Next.js
- Tailwind CSS
- shadcn/ui
- Lucide Icons

Visual Style:
- Clean whitespace
- Subtle shadows
- Minimal borders
- Blue primary accent
- Dark/light mode
- Responsive layouts

Avoid:
- overly colorful UI
- enterprise ERP complexity
- cluttered dashboards
- unnecessary animations

---

## Application Structure

Routes:

/dashboard
/dashboard/clients
/dashboard/projects
/dashboard/invoices
/dashboard/contracts
/dashboard/portal
/dashboard/time
/dashboard/pulse
/dashboard/settings

---

## Sidebar Requirements

Desktop:
- persistent sidebar
- collapsible

Mobile:
- drawer navigation

Sidebar items:
- Dashboard
- Clients
- Projects
- Invoice
- Contracts
- Portal
- Time
- Pulse
- Settings

---

## Dashboard Requirements

Widgets:
- Revenue overview
- Pending payments
- Recent invoices
- Activity timeline
- Active clients
- Quick actions

All widgets should:
- support loading states
- support empty states
- support responsive stacking

---

## Invoice Module Requirements

Pages:
- Invoice list
- Create invoice
- Edit invoice
- Preview invoice

Create invoice screen:
- split layout desktop
- live preview panel
- dynamic calculations
- GST support
- recurring invoice options

---

## Client Module Requirements

Pages:
- Client list
- Client profile
- Add/edit client modal

Features:
- searchable tables
- filters
- pagination
- activity timeline

---

## Global UX Rules

Every page must include:
- loading states
- skeleton loaders
- empty states
- error states
- mobile responsiveness
- toast notifications

---

## Component Requirements

Use reusable components for:
- tables
- forms
- cards
- modals
- dropdowns
- command palette
- KPI widgets
- charts
- tabs
- badges

---

## Mobile Responsiveness

Mobile behavior:
- stacked layouts
- bottom spacing for floating actions
- touch-friendly controls
- horizontal scroll for tables
- collapsible sections

---

## Output Expectations

Generate:
- high-fidelity SaaS UI
- responsive layouts
- dashboard pages
- forms
- settings pages
- workflows
- onboarding screens
- empty states
- loading skeletons
- modals
- reusable components

The output should be implementation-ready for:
- Next.js
- Tailwind
- shadcn/ui

---