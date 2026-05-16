# Stackivo — Project Context

## Product Overview

Stackivo is a premium SaaS operating system for freelancers, consultants, creators, and solo professionals.

The platform helps freelancers:
- manage clients
- generate GST-compliant invoices
- create contracts/proposals
- manage projects
- track time
- monitor payments
- manage subscriptions
- run their freelance business from one unified workspace

The product philosophy:
- minimal
- premium
- modern
- mobile-first
- workflow-focused
- low cognitive load
- not ERP/accounting-software complexity
- inspired by Linear, Vercel, Stripe Dashboard, and Notion

---

# Tech Stack

## Frontend
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide React
- Recharts

## Backend
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Row Level Security (RLS)

## Payments
- Razorpay Subscriptions

## Communication
- Brevo

## Deployment
- Vercel

---

# Product Modules

## Core Modules
- Dashboard
- Clients
- Projects
- Invoices
- Contracts
- Time Tracking
- Pulse Analytics
- Settings
- Billing
- Notifications

## Public Website
- Landing Page
- Pricing
- Auth
- Signup
- Onboarding Funnel
- Dashboard Transition Flow

---

# Subscription Model

## Free Plan
- Maximum 5 lifetime-created clients
- Unlimited invoices
- Unlimited projects
- Unlimited contracts
- Unlimited time tracking
- Full operational access

IMPORTANT:
Deleting clients does NOT reduce usage count.

## Pro Plan
- Unlimited clients
- Advanced branding
- Future premium capabilities

## Business Plan
- Placeholder for future expansion

---

# Architecture Principles

- Follow BRD and FRD strictly
- Avoid feature drift
- Avoid enterprise ERP complexity
- Prefer reusable architecture
- Maintain strict type safety
- Use server actions where appropriate
- Maintain scalable service-layer architecture
- Preserve RLS compatibility
- Maintain mobile responsiveness
- Use real backend data only
- No mock/demo/static business data
- Preserve onboarding/business identity consistency

---

# Backend Foundation Status

## Completed
- Supabase setup
- Typed env system
- Middleware auth
- Protected/public routing
- Subscription architecture
- Feature gating
- Usage tracking
- RLS policies
- Storage buckets
- Typed DB structure
- Auth system
- OAuth placeholders
- Session persistence
- Billing architecture
- Razorpay integration foundation
- Notification infrastructure
- PDF/document delivery infrastructure
- File metadata architecture

---

# Operational Systems Status

## Completed
- Client persistence
- Business onboarding
- GST onboarding
- Invoice persistence
- Invoice item system
- GST-aware calculations
- Contracts persistence
- Proposal persistence
- Project persistence
- Time tracking persistence
- Pulse analytics aggregation
- Dashboard aggregation
- Notification persistence
- Public share architecture
- Freelancer signature onboarding/settings flow
- Contract public signing flow with audit metadata
- Public share token generation + share-link copy flow
- Signature capture modal for draw/type/upload modes
- Contract and onboarding signature gating
- Signature PDF snapshot/audit trail support

---

# GST System

GST implementation is based on the dedicated GST compliance implementation document.

Supported:
- GST registration handling
- GSTIN validation
- CGST
- SGST
- IGST
- Intra-state calculations
- Inter-state calculations
- GST-ready invoices

NOT supported:
- GST filing
- GST government APIs

---

# UI & UX Status

## Completed
- Full SaaS dashboard UI
- Marketing website UI
- Responsive layouts
- Dark/light theme
- Billing dashboard
- Onboarding flows
- Dashboard shell
- Invoice builder
- Contracts builder
- Pulse analytics
- Client portal UI

The product should feel:
- premium
- spacious
- modern
- cinematic
- workflow-focused
- polished

---

# Important Product Rules

## Always Maintain
- Freelancer-focused UX
- Mobile responsiveness
- Real backend-connected data
- Clean dashboard hierarchy
- Premium SaaS feel
- Unified ecosystem between website and app

## Avoid
- Fake analytics
- Demo business data
- ERP-style complexity
- Over-engineering
- Unnecessary feature expansion
- Architectural rewrites unless necessary

---

# Current Development Phase

Stackivo is currently in:
# Production Stabilization Phase

Main priorities:
1. Bug fixing
2. Workflow correctness
3. Auth/session stability
4. Billing correctness
5. GST correctness
6. Performance optimization
7. Security/RLS audit
8. Production hardening
9. Deployment readiness
10. Beta-launch readiness

Recent stabilization focus:
- Resolve hydration issues in public document rendering
- Keep contract builder and public signing flows stable
- Ensure onboarding signature setup persists correctly
- Expose share links clearly for manual client-flow testing
- Keep signature capture responsive on mouse, trackpad, and touch

---

# Current Engineering Workflow

Future AI prompts should:
- avoid re-analyzing entire docs repeatedly
- avoid architectural rewrites
- focus on targeted stabilization/fixes
- preserve existing systems
- preserve existing backend architecture
- preserve existing subscription logic
- preserve existing onboarding logic
- preserve existing GST logic

When updating product docs or fixing workflows, prefer:
- incremental stabilization
- narrow validation
- production-safe edits
- user-visible correctness over structural change

Use:
- narrow operational prompts
- targeted debugging prompts
- production-hardening prompts

---

# Known Risks To Watch

- Middleware redirect loops
- Hydration mismatches
- Subscription-state stale caching
- RLS access edge cases
- GST recalculation correctness
- Dashboard stale data
- Duplicate queries
- Mobile responsive edge cases
- Public-share token safety
- File upload permission mismatches
- Razorpay webhook synchronization
- Auth session refresh edge cases

---

# Final Product Goal

Stackivo should feel like:
- a real production SaaS platform
- a trusted freelancer operating system
- a premium modern workspace
- a stable business-critical tool

The system should prioritize:
- reliability
- clarity
- correctness
- operational trust
- smooth workflows
- scalable architecture