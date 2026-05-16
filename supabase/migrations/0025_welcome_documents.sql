-- =============================================================================
-- 0025_welcome_documents.sql
--
-- Welcome Document system. A welcome document is an *onboarding guide*
-- a freelancer sends to a client at the start of an engagement. It is
-- explicitly NOT a contract — it sets expectations about workflow,
-- communication, revisions, response times, etc., without legal scope
-- or pricing.
--
-- Schema mirrors the proven patterns from `contracts`:
--   - `content` is a JSON-string array of {heading, body} sections
--     (plain text helper in `src/features/welcome-documents/content.ts`).
--   - `public_token` mints a `/w/<token>` shareable URL.
--   - One row per document; revisions create a new version row pointing
--     back at `parent_id`.
--   - View tracking + acknowledgement live in dedicated child tables so
--     they can scale independently and be queried for analytics.
-- =============================================================================

-- --- welcome_documents ------------------------------------------------------

create table if not exists public.welcome_documents (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,

  client_id                uuid references public.clients(id) on delete set null,
  project_id               uuid references public.projects(id) on delete set null,

  title                    text not null,
  /**
   * Optional opening paragraph rendered above the section list. Used
   * for personal greetings ("Hey {{client_name}}, here's everything
   * you need to know to work with us…").
   */
  intro                    text,
  /** JSON array of { heading, body } — same shape as contracts.content. */
  content                  text not null default '[]',

  /** Visual customisation. */
  brand_color              text,
  /** Optional cover image (R2 key) shown at the top of the public viewer. */
  cover_image_r2_key       text,

  status                   text not null default 'draft'
                             check (status in ('draft','published','archived')),

  /**
   * Public share token — minted on first send, never rotated. Lives on
   * /w/<token> like contracts/invoices. NULL means "not yet shared".
   */
  public_token             text unique,

  /**
   * Versioning — new revisions of an existing document point at the
   * original via parent_id and bump version. The original keeps its
   * public_token so existing share links continue to resolve to the
   * latest version (we read by public_token then follow the chain).
   */
  version                  integer not null default 1 check (version >= 1),
  parent_id                uuid references public.welcome_documents(id) on delete cascade,

  /**
   * Acknowledgement gate. When true, the public viewer surfaces an
   * "I have read and understood this" button; clicks insert into
   * `welcome_document_acknowledgements`. When false, the document is
   * read-only.
   */
  acknowledgement_required boolean not null default false,

  /**
   * `viewed_at` mirrors the contracts/invoices pattern so we can show
   * a quick "Viewed Xd ago" badge in the dashboard list. The full
   * audit trail is in `welcome_document_views`.
   */
  viewed_at                timestamptz,
  published_at             timestamptz,
  sent_at                  timestamptz,

  /** Soft-delete. Hard-deletion is an admin-only operation. */
  deleted_at               timestamptz,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists welcome_documents_user_id_idx
  on public.welcome_documents (user_id);
create index if not exists welcome_documents_client_id_idx
  on public.welcome_documents (client_id);
create index if not exists welcome_documents_project_id_idx
  on public.welcome_documents (project_id);
create index if not exists welcome_documents_status_idx
  on public.welcome_documents (status);
create index if not exists welcome_documents_public_token_idx
  on public.welcome_documents (public_token);
create index if not exists welcome_documents_parent_id_idx
  on public.welcome_documents (parent_id);

create trigger welcome_documents_set_updated_at
before update on public.welcome_documents
for each row execute function public.set_updated_at();

-- --- welcome_document_views -------------------------------------------------
-- Append-mostly. Each unique (document_id, viewer_email|ip_hash) is one
-- row; subsequent visits bump `view_count` + `last_viewed_at`.

create table if not exists public.welcome_document_views (
  id               uuid primary key default gen_random_uuid(),
  document_id      uuid not null references public.welcome_documents(id) on delete cascade,
  /** Authenticated viewer (portal member) or null for anonymous /w/<token>. */
  viewer_user_id   uuid references auth.users(id) on delete set null,
  /** Captured for anonymous viewers when we have it (e.g. portal member email). */
  viewer_email     text,
  /** SHA-256 of (ip + user-agent) for de-dupe without storing raw IP. */
  fingerprint_hash text not null,
  user_agent       text,
  first_viewed_at  timestamptz not null default now(),
  last_viewed_at   timestamptz not null default now(),
  view_count       integer not null default 1,
  unique (document_id, fingerprint_hash)
);

create index if not exists welcome_document_views_document_id_idx
  on public.welcome_document_views (document_id);
create index if not exists welcome_document_views_viewer_user_id_idx
  on public.welcome_document_views (viewer_user_id);

-- --- welcome_document_acknowledgements --------------------------------------

create table if not exists public.welcome_document_acknowledgements (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null references public.welcome_documents(id) on delete cascade,
  /** Always set when the viewer was authenticated; nullable for anon. */
  viewer_user_id  uuid references auth.users(id) on delete set null,
  /** Always required — even authed users type their name to confirm. */
  viewer_name     text not null,
  viewer_email    text,
  /** SHA-256 of (ip + ua) for an audit trail without raw IP. */
  ip_hash         text,
  user_agent      text,
  acknowledged_at timestamptz not null default now(),
  /** One ack per (document, fingerprint) — replaying the action is a no-op. */
  unique (document_id, viewer_user_id),
  unique (document_id, ip_hash)
);

create index if not exists welcome_document_acks_document_id_idx
  on public.welcome_document_acknowledgements (document_id);

-- --- welcome_document_templates ---------------------------------------------
-- Two flavours: system templates (user_id IS NULL, is_system = true) seeded
-- below, and per-user templates created via "save as template" in the UI.

create table if not exists public.welcome_document_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  /** Same JSON shape as welcome_documents.content. */
  content     text not null default '[]',
  intro       text,
  /** Free-form category label shown in the picker. */
  category    text,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists welcome_document_templates_user_id_idx
  on public.welcome_document_templates (user_id);
create index if not exists welcome_document_templates_is_system_idx
  on public.welcome_document_templates (is_system);

create trigger welcome_document_templates_set_updated_at
before update on public.welcome_document_templates
for each row execute function public.set_updated_at();

-- --- portal_welcome_documents (link table) ----------------------------------
-- Lets a freelancer attach an existing welcome document to a client portal.
-- Mirrors `portal_contracts` / `portal_invoices` from migration 0024.

create table if not exists public.portal_welcome_documents (
  portal_id   uuid not null references public.portals(id) on delete cascade,
  document_id uuid not null references public.welcome_documents(id) on delete cascade,
  added_by    uuid references auth.users(id) on delete set null,
  added_at    timestamptz not null default now(),
  primary key (portal_id, document_id)
);

create index if not exists portal_welcome_documents_document_id_idx
  on public.portal_welcome_documents (document_id);

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.welcome_documents               enable row level security;
alter table public.welcome_document_views          enable row level security;
alter table public.welcome_document_acknowledgements enable row level security;
alter table public.welcome_document_templates      enable row level security;
alter table public.portal_welcome_documents        enable row level security;

-- welcome_documents: owners can do anything; portal members can read
-- the documents attached to portals they're members of.
drop policy if exists welcome_documents_owner_all on public.welcome_documents;
create policy welcome_documents_owner_all
  on public.welcome_documents
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists welcome_documents_portal_member_read on public.welcome_documents;
create policy welcome_documents_portal_member_read
  on public.welcome_documents
  for select
  using (
    exists (
      select 1
      from public.portal_welcome_documents pwd
      join public.portal_members pm
        on pm.portal_id = pwd.portal_id
       and pm.user_id   = auth.uid()
       and pm.revoked_at is null
      where pwd.document_id = welcome_documents.id
    )
  );

-- views: owner reads; service-role writes (anonymous /w/<token> visits
-- go through the admin client). Authenticated viewers can also insert
-- their own row.
drop policy if exists welcome_document_views_owner_read on public.welcome_document_views;
create policy welcome_document_views_owner_read
  on public.welcome_document_views
  for select
  using (
    exists (
      select 1 from public.welcome_documents wd
      where wd.id = welcome_document_views.document_id
        and wd.user_id = auth.uid()
    )
  );

drop policy if exists welcome_document_views_member_insert on public.welcome_document_views;
create policy welcome_document_views_member_insert
  on public.welcome_document_views
  for insert
  with check (auth.uid() = viewer_user_id);

-- acknowledgements: viewer inserts; owner reads.
drop policy if exists welcome_document_acks_viewer_insert on public.welcome_document_acknowledgements;
create policy welcome_document_acks_viewer_insert
  on public.welcome_document_acknowledgements
  for insert
  with check (auth.uid() = viewer_user_id);

drop policy if exists welcome_document_acks_owner_read on public.welcome_document_acknowledgements;
create policy welcome_document_acks_owner_read
  on public.welcome_document_acknowledgements
  for select
  using (
    exists (
      select 1 from public.welcome_documents wd
      where wd.id = welcome_document_acknowledgements.document_id
        and wd.user_id = auth.uid()
    )
  );

-- templates: anyone can read system templates; users own their own.
drop policy if exists welcome_document_templates_system_read on public.welcome_document_templates;
create policy welcome_document_templates_system_read
  on public.welcome_document_templates
  for select
  using (is_system = true);

drop policy if exists welcome_document_templates_owner_all on public.welcome_document_templates;
create policy welcome_document_templates_owner_all
  on public.welcome_document_templates
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- portal_welcome_documents: owner of the portal manages; members read.
drop policy if exists portal_welcome_documents_owner_all on public.portal_welcome_documents;
create policy portal_welcome_documents_owner_all
  on public.portal_welcome_documents
  for all
  using (
    exists (
      select 1 from public.portals p
      where p.id = portal_welcome_documents.portal_id
        and p.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.portals p
      where p.id = portal_welcome_documents.portal_id
        and p.owner_user_id = auth.uid()
    )
  );

drop policy if exists portal_welcome_documents_member_read on public.portal_welcome_documents;
create policy portal_welcome_documents_member_read
  on public.portal_welcome_documents
  for select
  using (
    exists (
      select 1 from public.portal_members pm
      where pm.portal_id = portal_welcome_documents.portal_id
        and pm.user_id   = auth.uid()
        and pm.revoked_at is null
    )
  );

-- =============================================================================
-- Seed: built-in system templates.
--
-- Stored as TEXT (not jsonb) to mirror `contracts.content`. The
-- application parses to/from JSON via the same `parseContractContent`-
-- shaped helper.
--
-- Idempotent — `where not exists` check by title means re-running the
-- migration won't duplicate.
-- =============================================================================

insert into public.welcome_document_templates
  (id, user_id, title, description, intro, content, category, is_system)
select
  gen_random_uuid(), null,
  'Designer onboarding',
  'A premium welcome packet for design clients — covers process, communication, revisions, and approvals.',
  'Welcome aboard! I''m thrilled we''re working together on your project. This guide walks you through how I work, what to expect at each stage, and how we''ll communicate. Read this once at the start — it answers the questions clients usually ask along the way.',
  '[
    {"heading":"How we''ll work together","body":"Every project follows the same four phases: Discovery → Design → Refinement → Delivery. You''ll always know which phase we''re in and what comes next. I block focused design time in the mornings and reserve afternoons for client communication and reviews."},
    {"heading":"Communication & response times","body":"Email is the primary channel for anything that needs a paper trail. For quick questions, the Client Portal comments thread is faster. I respond within one business day (Mon–Fri, IST). I don''t check messages on weekends — please don''t expect replies until Monday."},
    {"heading":"The revision flow","body":"Each design round includes two rounds of revisions. Please consolidate feedback from your team before sending — it keeps momentum and avoids contradictory edits. Use comments directly on the Figma file or attach screenshots in the portal."},
    {"heading":"Project stages & milestones","body":"You''ll see status changes in your portal as we move through the project. Each milestone (Design v1, Design v2 with revisions, Final delivery) requires your written approval before we proceed. This protects both of us."},
    {"heading":"Approvals","body":"Approvals happen in writing — either in the portal comments or by email. A simple ''Approved'' or ''Approved with comments below'' is enough. Verbal approvals on calls always need a follow-up confirmation in writing."},
    {"heading":"Payments","body":"You''ll receive invoices via email and inside your portal. Payment is via Razorpay (UPI, cards, net banking). Invoices are due within 7 days. The kickoff payment locks in your project slot — design work begins after it clears."},
    {"heading":"Files & deliverables","body":"All working files (Figma, exports, brand assets) live in your portal. Final deliverables are also pushed to a dedicated folder labelled ''Final''. You''ll get full ownership of the deliverables once the final invoice is paid."},
    {"heading":"What I need from you","body":"To keep things moving: prompt feedback within 3 business days of each delivery, consolidated team feedback (one voice), and clear approval at each milestone. The smoother this loop, the faster we ship."},
    {"heading":"If something goes wrong","body":"If you''re unhappy with anything — pace, direction, communication — please tell me directly. I''d rather adjust mid-project than disappoint you at delivery. The same goes for me: I''ll flag risks early."},
    {"heading":"Let''s begin","body":"Once you''ve read this, drop a comment in your portal so I know we''re aligned. I''m looking forward to a great project together."}
  ]',
  'Designer',
  true
where not exists (
  select 1 from public.welcome_document_templates
  where is_system = true and title = 'Designer onboarding'
);

insert into public.welcome_document_templates
  (id, user_id, title, description, intro, content, category, is_system)
select
  gen_random_uuid(), null,
  'Developer onboarding',
  'For software / web development engagements. Sets ground rules around scope, code reviews, deployments, and bugs.',
  'Welcome to the project! This guide explains how I run development work — sprint cadence, code reviews, deployments, bug handling, and what counts as in-scope vs out-of-scope. Skim this once now; you can always come back to it.',
  '[
    {"heading":"Engagement model","body":"This project runs in 1-week sprints. At the start of each sprint we agree on a small, shippable scope. At the end of the sprint you''ll receive a demo + a written changelog. Anything that doesn''t fit moves to the next sprint."},
    {"heading":"Communication","body":"Slack / portal comments for quick questions (response within 4 hours, Mon–Fri 10:00–18:00 IST). Email for anything that needs a record. I keep Wednesday afternoons as deep-work time and don''t reply during that window — urgent issues should be flagged with [URGENT] in the subject."},
    {"heading":"What counts as ''in scope''","body":"In scope = the user stories agreed for the current sprint. Out of scope = anything that emerges mid-sprint that wasn''t in the original plan. Out-of-scope items aren''t rejected — they''re added to the backlog for the next sprint, and we negotiate trade-offs together."},
    {"heading":"Code reviews & quality","body":"Every change goes through a pull request. You (or your team) get review access on GitHub. I follow conventional-commit messages, write tests for new logic, and run the linter + type-checker on every commit. CI must be green before merge."},
    {"heading":"Deployments","body":"Code ships behind a feature flag where possible. Production deployments happen on weekday afternoons (never Fridays after 16:00). After each deploy I send a short note to the portal with what changed and how to verify."},
    {"heading":"Bugs vs new work","body":"A bug = something that worked yesterday, doesn''t work today. Bugs are fixed inside the existing fee. A new feature, even a small one, counts as new work and goes through the sprint planning loop. This rule exists to protect both of us from scope creep."},
    {"heading":"Access & credentials","body":"I''ll need invite-only access to: GitHub repo, your hosting (Vercel / AWS / etc.), DB read-only, and any third-party APIs in use. Use a password manager — never paste secrets in chat. I rotate any credentials you share at project end."},
    {"heading":"Payments","body":"Sprint-based: invoiced at the start of each sprint, due within 5 days. The next sprint starts only after the previous invoice is paid. This keeps the rhythm tight and protects cash flow on both sides."},
    {"heading":"Handoff & ownership","body":"All code is yours from day one — pushed to your repo. At project end I write a short README covering how to run, deploy, and extend the codebase, plus a 30-minute walkthrough call."},
    {"heading":"Ready to begin","body":"Reply in your portal once you''ve read this — that''s our handshake to kick off Sprint 1."}
  ]',
  'Developer',
  true
where not exists (
  select 1 from public.welcome_document_templates
  where is_system = true and title = 'Developer onboarding'
);

insert into public.welcome_document_templates
  (id, user_id, title, description, intro, content, category, is_system)
select
  gen_random_uuid(), null,
  'Writer / content creator onboarding',
  'For copywriting, content strategy, and editorial engagements.',
  'Welcome — I''m excited to work on this with you. Writing is collaborative, and the smoother our process, the better the words. This guide explains how I work end-to-end so you know what to expect.',
  '[
    {"heading":"Our writing process","body":"Every piece goes through five steps: Brief → Outline → Draft → Revisions → Polish. You approve at the Brief and Outline stages so we''re aligned before I draft. This catches direction issues early, before they become rewrite issues."},
    {"heading":"Briefs","body":"For each piece, I''ll send a short Brief covering: audience, goal, tone, key takeaways, length, and SEO targets (if relevant). You confirm or tweak before I outline. A clear brief at the start saves 80% of revisions later."},
    {"heading":"Revisions","body":"Each piece includes two revision rounds. Please consolidate edits from your team into one document — fragmented feedback from multiple stakeholders is the #1 cause of slow turnaround. Track changes in Google Docs is my preferred way to receive edits."},
    {"heading":"Tone & voice","body":"During discovery I''ll capture your brand voice in a short style guide (formal/casual, sentence length, words to use/avoid). Once approved, every piece references it. If your voice evolves mid-project, just tell me — it''s a living doc."},
    {"heading":"Turnaround","body":"Typical turnaround: 3–5 business days for blog posts (1500 words), 2 days for shorter copy. Rush jobs are possible at a 50% surcharge — agreed in writing first."},
    {"heading":"Communication","body":"Email for briefs and final deliverables. Portal comments for in-progress questions (Mon–Fri, response within one business day). I don''t take edits over phone calls — too easy to miss nuance. Always send edits in writing."},
    {"heading":"Approvals","body":"Each piece needs written approval before it''s considered final and invoiced. ''Approved'' in the portal or email is enough. Once approved, future edits are out of scope and billed separately."},
    {"heading":"Ownership & credit","body":"You own all final approved content. I retain the right to mention the engagement in my portfolio (no internal/confidential details). If you prefer NDA-only with no portfolio rights, just say so — happy to adjust."},
    {"heading":"Payments","body":"Per piece or monthly retainer, invoiced as agreed. Payment is via Razorpay, due within 7 days. Final delivery happens after the invoice clears for one-off projects."},
    {"heading":"Let''s begin","body":"Acknowledge this guide in your portal and I''ll send across the first brief within 24 hours. Excited to write something great with you."}
  ]',
  'Writer',
  true
where not exists (
  select 1 from public.welcome_document_templates
  where is_system = true and title = 'Writer / content creator onboarding'
);

insert into public.welcome_document_templates
  (id, user_id, title, description, intro, content, category, is_system)
select
  gen_random_uuid(), null,
  'Generic freelancer onboarding',
  'A neutral, all-purpose onboarding guide. Edit any section to match your craft.',
  'Welcome! I''m glad we''re working together. This document covers the practical side of our engagement — how I communicate, how revisions and approvals work, and what to expect at each stage. A 5-minute read now saves us both time later.',
  '[
    {"heading":"How we''ll work together","body":"Every engagement runs through the same shape: Discovery → Work → Review → Delivery. I''ll let you know which stage we''re in and what''s next. Surprises are bad for projects; clarity wins."},
    {"heading":"Communication","body":"I respond within one business day (Mon–Fri). For routine updates use the portal comments; for anything formal (changes to scope, approvals, sign-offs), use email. I don''t reply on weekends or public holidays."},
    {"heading":"Project stages","body":"You''ll see status updates as we move through the work — Discovery, In progress, In review, Delivered. Each stage has a clear deliverable and approval gate before we move on."},
    {"heading":"Revisions","body":"Each round includes two revision passes. Send consolidated, written feedback — fragmented or contradictory comments slow everything down. After the included rounds, additional revisions are billed at my hourly rate."},
    {"heading":"Approvals","body":"Approvals happen in writing — either in the portal or by email. ''Approved'' is enough. Approvals on calls need a follow-up confirmation."},
    {"heading":"Payments","body":"Invoices are sent via email and the portal. Payment is via Razorpay (UPI, card, net banking), due within 7 days unless we''ve agreed otherwise. Work pauses if an invoice is more than 14 days overdue."},
    {"heading":"What I need from you","body":"Quick decisions, consolidated feedback, and a clear single point of contact on your side. The fewer hands the work passes through, the better the outcome."},
    {"heading":"If anything goes wrong","body":"Tell me. I''d rather hear ''this isn''t working'' early than discover it at delivery. Same goes for me — I''ll flag risks the moment I see them."},
    {"heading":"Ready when you are","body":"That''s everything. Acknowledge this in the portal and we''ll get started."}
  ]',
  'General',
  true
where not exists (
  select 1 from public.welcome_document_templates
  where is_system = true and title = 'Generic freelancer onboarding'
);

insert into public.welcome_document_templates
  (id, user_id, title, description, intro, content, category, is_system)
select
  gen_random_uuid(), null,
  'Blank document',
  'Start with an empty canvas — write your own onboarding from scratch.',
  null,
  '[
    {"heading":"Untitled section","body":""}
  ]',
  'Blank',
  true
where not exists (
  select 1 from public.welcome_document_templates
  where is_system = true and title = 'Blank document'
);

-- =============================================================================
-- Done.
-- =============================================================================
