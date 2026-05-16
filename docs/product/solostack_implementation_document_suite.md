# Stackivo — Implementation Document Suite

Version: 1.0
Status: Pre-Development Architecture Baseline
Prepared For: Stackivo Product & Engineering Team

---

# TABLE OF CONTENTS

1. System Architecture Document (SAD)
2. Database Schema Document
3. API Contract Blueprint
4. Design System Specification
5. User Flow Document
6. MVP Scope Lock Document
7. Coding Standards & Project Structure
8. Stitch Master UI Generation File
9. AI-Assisted Development Guidelines

---

# 1. SYSTEM ARCHITECTURE DOCUMENT (SAD)

## 1.1 Architecture Philosophy

Stackivo is designed as a modular multi-tenant SaaS platform where all modules operate within a unified workspace architecture.

Core architectural principles:
- One workspace
- One authentication system
- One shared client database
- One shared project system
- Shared file storage
- Shared notifications
- Shared billing
- Mobile-first architecture
- API-first internal design
- Reusable component architecture
- AI-friendly folder structure

---

## 1.2 High-Level System Architecture

Frontend Layer:
- Next.js App Router
- React + TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod Validation

Backend Layer:
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Realtime
- Supabase Edge Functions

Third-Party Integrations:
- Razorpay (payments)
- Brevo (emails)
- Vercel (hosting)
- GitHub (version control)

---

## 1.3 Frontend Architecture

### Framework
- Next.js 15+
- App Router architecture
- Server Components where possible
- Client Components only for interactive areas

### State Management
Global State:
- Zustand (minimal global state)

Server State:
- TanStack Query

Form State:
- React Hook Form

Validation:
- Zod schemas

---

## 1.4 Recommended Frontend Folder Structure

```plaintext
src/
 ├── app/
 ├── components/
 │    ├── ui/
 │    ├── shared/
 │    ├── dashboard/
 │    ├── invoices/
 │    ├── contracts/
 │    ├── clients/
 │    ├── projects/
 │    └── settings/
 │
 ├── features/
 │    ├── auth/
 │    ├── invoices/
 │    ├── clients/
 │    ├── projects/
 │    ├── contracts/
 │    ├── portal/
 │    ├── pulse/
 │    └── time/
 │
 ├── services/
 ├── hooks/
 ├── stores/
 ├── types/
 ├── schemas/
 ├── lib/
 ├── constants/
 ├── config/
 └── utils/
```

---

## 1.5 Multi-Tenant Strategy

Architecture Type:
- Shared database
- Row-level tenant isolation

Every business entity table must contain:
- user_id UUID

Example:
- invoices.user_id
- clients.user_id
- projects.user_id

All database queries must be automatically scoped to:
- authenticated user

---

## 1.6 Authentication Architecture

Authentication Provider:
- Supabase Auth

Supported Methods:
- Email/password
- Google OAuth

Authentication Flow:
1. User signs up
2. Email verification sent
3. Session created
4. JWT issued
5. Middleware validates protected routes
6. User context injected

Protected Routes:
- /dashboard/*
- /admin/*

Public Routes:
- /login
- /signup
- /invoice/:token
- /portal/:token
- /sign/:token

---

## 1.7 File Storage Architecture

Storage Provider:
- Supabase Storage

Buckets:
- invoices
- contracts
- portal-files
- profile-images
- branding-assets

Security Rules:
- User-private access by default
- Public signed URLs only where necessary
- Expiring links for public sharing

---

## 1.8 Payment Architecture

Payment Provider:
- Razorpay

Supported Payment Methods:
- UPI
- Credit/Debit Cards
- Net Banking
- Wallets

Payment Flow:
1. Invoice created
2. Razorpay payment link generated
3. Client opens hosted payment page
4. Webhook received
5. Invoice marked paid
6. Email notification triggered

Webhook Security:
- Signature verification mandatory

---

## 1.9 Email Architecture

Provider:
- Brevo

Transactional Emails:
- Email verification
- Password reset
- Invoice sent
- Payment received
- Reminder notifications
- Contract signature requests

Template System:
- Dynamic templates
- Branded templates
- Variables injected server-side

---

## 1.10 Deployment Architecture

Hosting:
- Vercel

Environments:
- development
- staging
- production

Deployment Pipeline:
1. Push to GitHub
2. Vercel auto-build
3. Type checking
4. Build validation
5. Deploy preview
6. Production deployment

---

## 1.11 Security Architecture

Security Layers:
- JWT authentication
- Row Level Security
- HTTPS-only
- CSP headers
- Secure cookies
- API validation
- Rate limiting
- File access isolation

Sensitive Operations:
- Payment webhooks
- Invoice generation
- Subscription management
- Password reset

---

## 1.12 Performance Strategy

Performance Targets:
- Initial load < 2s
- Dashboard render < 1s
- Invoice creation < 500ms interaction latency

Optimization Strategy:
- Lazy loading
- Dynamic imports
- Image optimization
- Route-based splitting
- Query caching
- Optimistic updates

---

# 2. DATABASE SCHEMA DOCUMENT

## 2.1 Core Tables

### users

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| full_name | text | required |
| email | text | unique |
| avatar_url | text | optional |
| company_name | text | optional |
| gst_number | text | optional |
| created_at | timestamptz | default now() |

---

### clients

| Column | Type |
|---|---|
| id | uuid |
| user_id | uuid |
| full_name | text |
| email | text |
| phone | text |
| company_name | text |
| gst_number | text |
| address | text |
| notes | text |
| created_at | timestamptz |

Indexes:
- user_id
- email
- company_name

---

### projects

| Column | Type |
|---|---|
| id | uuid |
| user_id | uuid |
| client_id | uuid |
| name | text |
| description | text |
| status | text |
| start_date | date |
| due_date | date |
| created_at | timestamptz |

---

### invoices

| Column | Type |
|---|---|
| id | uuid |
| user_id | uuid |
| client_id | uuid |
| project_id | uuid |
| invoice_number | text |
| issue_date | date |
| due_date | date |
| subtotal | numeric |
| gst_amount | numeric |
| total_amount | numeric |
| currency | text |
| status | text |
| payment_link | text |
| payment_status | text |
| notes | text |
| terms | text |
| created_at | timestamptz |

---

### invoice_items

| Column | Type |
|---|---|
| id | uuid |
| invoice_id | uuid |
| description | text |
| quantity | numeric |
| unit_price | numeric |
| gst_rate | numeric |
| amount | numeric |

---

### contracts

| Column | Type |
|---|---|
| id | uuid |
| user_id | uuid |
| client_id | uuid |
| project_id | uuid |
| title | text |
| content | text |
| status | text |
| public_token | text |
| signed_at | timestamptz |
| created_at | timestamptz |

---

### files

| Column | Type |
|---|---|
| id | uuid |
| user_id | uuid |
| project_id | uuid |
| file_name | text |
| storage_path | text |
| file_size | bigint |
| mime_type | text |
| created_at | timestamptz |

---

### notifications

| Column | Type |
|---|---|
| id | uuid |
| user_id | uuid |
| type | text |
| title | text |
| message | text |
| read | boolean |
| created_at | timestamptz |

---

### subscriptions

| Column | Type |
|---|---|
| id | uuid |
| user_id | uuid |
| plan | text |
| status | text |
| razorpay_subscription_id | text |
| current_period_end | timestamptz |
| created_at | timestamptz |

---

## 2.2 Row-Level Security Policies

Policy Pattern:

```sql
USING (auth.uid() = user_id)
```

Applied To:
- clients
- projects
- invoices
- contracts
- files
- notifications

---

# 3. API CONTRACT BLUEPRINT

## 3.1 Auth APIs

POST /auth/signup
POST /auth/login
POST /auth/logout
POST /auth/reset-password
POST /auth/verify-email

---

## 3.2 Client APIs

GET /clients
POST /clients
PATCH /clients/:id
DELETE /clients/:id

---

## 3.3 Invoice APIs

GET /invoices
POST /invoices
PATCH /invoices/:id
DELETE /invoices/:id
POST /invoices/:id/send
POST /invoices/:id/reminder
POST /invoices/:id/payment-link

---

## 3.4 Contract APIs

GET /contracts
POST /contracts
PATCH /contracts/:id
POST /contracts/:id/send
POST /contracts/:id/sign

---

## 3.5 Project APIs

GET /projects
POST /projects
PATCH /projects/:id
DELETE /projects/:id

---

# 4. DESIGN SYSTEM SPECIFICATION

## 4.1 Design Philosophy

Visual Style:
- Minimal
- Professional
- Linear-inspired
- Vercel-inspired
- Mobile-first
- Clean whitespace
- Low cognitive load

---

## 4.2 Typography

Primary Font:
- Inter

Monospace:
- JetBrains Mono

---

## 4.3 Component Standards

Buttons:
- Primary
- Secondary
- Ghost
- Destructive

Cards:
- 8px radius
- subtle border
- light shadow

Forms:
- consistent spacing
- inline validation
- label above input

Tables:
- sticky header
- sortable columns
- responsive stacking on mobile

---

## 4.4 Color System

Primary:
- Blue (#1E40AF)

Success:
- Green

Warning:
- Amber

Danger:
- Red

Neutral:
- Slate scale

---

## 4.5 Responsive Rules

Mobile:
- drawer sidebar
- stacked forms
- floating CTA buttons

Desktop:
- persistent sidebar
- grid layouts
- split views

---

# 5. USER FLOW DOCUMENT

## 5.1 User Onboarding Flow

Landing
→ Signup
→ Verify Email
→ Dashboard
→ Complete Profile
→ Add First Client
→ Create First Invoice
→ Send Invoice

---

## 5.2 Invoice Flow

Dashboard
→ Invoice List
→ Create Invoice
→ Select Client
→ Add Items
→ Preview
→ Send
→ Client Pays
→ Invoice Marked Paid
→ Notification Sent

---

## 5.3 Contract Flow

Contracts
→ Create Contract
→ Select Client
→ Add Terms
→ Send Signature Link
→ Client Signs
→ Status Updated
→ PDF Generated

---

## 5.4 Portal Flow

Project
→ Upload Files
→ Generate Share Link
→ Client Opens Portal
→ Reviews Files
→ Leaves Feedback

---

## 5.5 Payment Flow

Invoice
→ Razorpay Payment Link
→ Client Payment
→ Webhook Verification
→ Payment Success
→ Invoice Status Update
→ Email Confirmation

---

# 6. MVP SCOPE LOCK DOCUMENT

## 6.1 MVP Includes

Authentication:
- signup
- login
- Google OAuth
- reset password

Client Module:
- add/edit/delete clients
- client profile

Invoice Module:
- invoice CRUD
- PDF generation
- Razorpay payment links
- reminders
- status tracking

Dashboard:
- KPI cards
- revenue summary
- pending invoices

Infrastructure:
- subscriptions
- notifications
- file storage

---

## 6.2 Explicitly Excluded From MVP

Excluded:
- AI features
- team collaboration
- native mobile apps
- advanced analytics
- workflow automation builder
- CRM pipeline
- public APIs
- white-labeling
- tax filing integrations

---

# 7. CODING STANDARDS & PROJECT STRUCTURE

## 7.1 Naming Standards

Components:
- PascalCase

Hooks:
- useCamelCase

Files:
- kebab-case

Constants:
- UPPER_SNAKE_CASE

---

## 7.2 Component Architecture

Rules:
- reusable components first
- avoid duplicate UI logic
- extract business logic into hooks
- feature-based organization

---

## 7.3 TypeScript Rules

Requirements:
- strict mode enabled
- avoid any
- shared types centralized
- Zod validation for all forms

---

## 7.4 Git Standards

Branching:
- main
- dev
- feature/*
- hotfix/*

Commit Style:
- feat:
- fix:
- refactor:
- docs:

---

# 8. STITCH MASTER UI GENERATION FILE

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

# 9. AI-ASSISTED DEVELOPMENT GUIDELINES

## 9.1 Stitch Usage Strategy

Use Stitch for:
- page layouts
- dashboard screens
- responsive structures
- forms
- tables
- design system generation

Do NOT use Stitch for:
- backend logic
- database schema generation
- payment business logic
- RLS policies

---

## 9.2 Antigravity Usage Strategy

Use Antigravity for:
- component generation
- Supabase integration
- CRUD operations
- API logic
- state management
- TypeScript implementation

---

## 9.3 Token Optimization Rules

Always provide AI tools:
- exact scope
- exact module
- exact route
- exact requirements

Avoid:
- huge generic prompts
- full BRD dumps
- unnecessary context

Use:
- focused prompts
- modular generation
- route-by-route generation

---

## 9.4 Recommended Build Order

1. Auth
2. Dashboard shell
3. Client module
4. Invoice module
5. Payments
6. Notifications
7. Contracts
8. Portal
9. Time
10. Pulse

---

END OF DOCUMENT SUITE

