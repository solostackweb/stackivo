-- =============================================================================
-- 0029_reseed_welcome_document_templates.sql
--
-- Restores built-in welcome document templates if they were manually deleted
-- after migration 0025 had already run. This migration is intentionally
-- idempotent and checks by (is_system, title), matching the original seed
-- strategy from 0025.
-- =============================================================================

insert into public.welcome_document_templates
  (id, user_id, title, description, intro, content, category, is_system)
select
  gen_random_uuid(), null,
  'Designer onboarding',
  'A premium welcome packet for design clients - covers process, communication, revisions, and approvals.',
  'Welcome aboard! I''m thrilled we''re working together on your project. This guide walks you through how I work, what to expect at each stage, and how we''ll communicate. Read this once at the start - it answers the questions clients usually ask along the way.',
  '[
    {"heading":"How we''ll work together","body":"Every project follows the same four phases: Discovery, Design, Refinement, and Delivery. You''ll always know which phase we''re in and what comes next. I block focused design time in the mornings and reserve afternoons for client communication and reviews."},
    {"heading":"Communication & response times","body":"Email is the primary channel for anything that needs a paper trail. For quick questions, the Client Portal comments thread is faster. I respond within one business day (Mon-Fri, IST). I don''t check messages on weekends - please don''t expect replies until Monday."},
    {"heading":"The revision flow","body":"Each design round includes two rounds of revisions. Please consolidate feedback from your team before sending - it keeps momentum and avoids contradictory edits. Use comments directly on the Figma file or attach screenshots in the portal."},
    {"heading":"Project stages & milestones","body":"You''ll see status changes in your portal as we move through the project. Each milestone requires your written approval before we proceed. This protects both of us."},
    {"heading":"Approvals","body":"Approvals happen in writing - either in the portal comments or by email. A simple ''Approved'' or ''Approved with comments below'' is enough. Verbal approvals on calls always need a follow-up confirmation in writing."},
    {"heading":"Payments","body":"You''ll receive invoices via email and inside your portal. Payment is via Razorpay (UPI, cards, net banking). Invoices are due within 7 days. The kickoff payment locks in your project slot - design work begins after it clears."},
    {"heading":"Files & deliverables","body":"All working files, exports, and brand assets live in your portal. Final deliverables are pushed to a dedicated folder labelled ''Final''. You''ll get full ownership of the deliverables once the final invoice is paid."},
    {"heading":"What I need from you","body":"To keep things moving: prompt feedback within 3 business days of each delivery, consolidated team feedback, and clear approval at each milestone. The smoother this loop, the faster we ship."},
    {"heading":"If something goes wrong","body":"If you''re unhappy with anything - pace, direction, communication - please tell me directly. I''d rather adjust mid-project than disappoint you at delivery. The same goes for me: I''ll flag risks early."},
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
  'Welcome to the project! This guide explains how I run development work - sprint cadence, code reviews, deployments, bug handling, and what counts as in-scope vs out-of-scope. Skim this once now; you can always come back to it.',
  '[
    {"heading":"Engagement model","body":"This project runs in 1-week sprints. At the start of each sprint we agree on a small, shippable scope. At the end of the sprint you''ll receive a demo and a written changelog. Anything that doesn''t fit moves to the next sprint."},
    {"heading":"Communication","body":"Slack or portal comments work best for quick questions. Email is for anything that needs a record. I respond during business hours, Mon-Fri 10:00-18:00 IST. Urgent issues should be flagged with [URGENT] in the subject."},
    {"heading":"What counts as ''in scope''","body":"In scope means the user stories agreed for the current sprint. Out of scope means anything that emerges mid-sprint that wasn''t in the original plan. Out-of-scope items go into the backlog for the next sprint."},
    {"heading":"Code reviews & quality","body":"Every change goes through a pull request. I follow clear commit messages, write tests for new logic where appropriate, and run the linter and type-checker before merge."},
    {"heading":"Deployments","body":"Code ships behind a feature flag where possible. Production deployments happen on weekday afternoons. After each deploy I send a short note with what changed and how to verify."},
    {"heading":"Bugs vs new work","body":"A bug is something that worked yesterday and doesn''t work today. Bugs are fixed inside the existing fee. A new feature, even a small one, counts as new work and goes through sprint planning."},
    {"heading":"Access & credentials","body":"I''ll need invite-only access to the repo, hosting, database, and third-party APIs in use. Use a password manager - never paste secrets in chat. I rotate credentials at project end."},
    {"heading":"Payments","body":"Sprint-based work is invoiced at the start of each sprint and due within 5 days. The next sprint starts only after the previous invoice is paid."},
    {"heading":"Handoff & ownership","body":"All code is yours from day one and pushed to your repo. At project end I write a short README covering how to run, deploy, and extend the codebase."},
    {"heading":"Ready to begin","body":"Reply in your portal once you''ve read this - that''s our handshake to kick off Sprint 1."}
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
  'Welcome - I''m excited to work on this with you. Writing is collaborative, and the smoother our process, the better the words. This guide explains how I work end-to-end so you know what to expect.',
  '[
    {"heading":"Our writing process","body":"Every piece goes through five steps: Brief, Outline, Draft, Revisions, and Polish. You approve at the Brief and Outline stages so we''re aligned before I draft."},
    {"heading":"Briefs","body":"For each piece, I''ll send a short brief covering audience, goal, tone, key takeaways, length, and SEO targets if relevant. You confirm or tweak before I outline."},
    {"heading":"Revisions","body":"Each piece includes two revision rounds. Please consolidate edits from your team into one document - fragmented feedback from multiple stakeholders is the main cause of slow turnaround."},
    {"heading":"Tone & voice","body":"During discovery I''ll capture your brand voice in a short style guide. Once approved, every piece references it. If your voice evolves mid-project, just tell me."},
    {"heading":"Turnaround","body":"Typical turnaround is 3-5 business days for long-form pieces and 2 days for shorter copy. Rush jobs are possible at a surcharge, agreed in writing first."},
    {"heading":"Communication","body":"Email works best for briefs and final deliverables. Portal comments work for in-progress questions. I don''t take edits over phone calls - always send edits in writing."},
    {"heading":"Approvals","body":"Each piece needs written approval before it''s considered final and invoiced. ''Approved'' in the portal or email is enough. Once approved, future edits are out of scope."},
    {"heading":"Ownership & credit","body":"You own all final approved content. I retain the right to mention the engagement in my portfolio without internal or confidential details unless we agree otherwise."},
    {"heading":"Payments","body":"Per-piece or monthly retainer work is invoiced as agreed. Payment is via Razorpay and due within 7 days. Final delivery happens after the invoice clears for one-off projects."},
    {"heading":"Let''s begin","body":"Acknowledge this guide in your portal and I''ll send across the first brief within 24 hours."}
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
  'Welcome! I''m glad we''re working together. This document covers the practical side of our engagement - how I communicate, how revisions and approvals work, and what to expect at each stage. A 5-minute read now saves us both time later.',
  '[
    {"heading":"How we''ll work together","body":"Every engagement runs through the same shape: Discovery, Work, Review, and Delivery. I''ll let you know which stage we''re in and what''s next."},
    {"heading":"Communication","body":"I respond within one business day, Monday to Friday. For routine updates use the portal comments; for anything formal, use email. I don''t reply on weekends or public holidays."},
    {"heading":"Project stages","body":"You''ll see status updates as we move through the work. Each stage has a clear deliverable and approval gate before we move on."},
    {"heading":"Revisions","body":"Each round includes two revision passes. Send consolidated, written feedback. After the included rounds, additional revisions are billed at my hourly rate."},
    {"heading":"Approvals","body":"Approvals happen in writing - either in the portal or by email. ''Approved'' is enough. Approvals on calls need a follow-up confirmation."},
    {"heading":"Payments","body":"Invoices are sent via email and the portal. Payment is via Razorpay and due within 7 days unless we''ve agreed otherwise. Work pauses if an invoice is more than 14 days overdue."},
    {"heading":"What I need from you","body":"Quick decisions, consolidated feedback, and a clear single point of contact on your side. The fewer hands the work passes through, the better the outcome."},
    {"heading":"If anything goes wrong","body":"Tell me. I''d rather hear ''this isn''t working'' early than discover it at delivery. Same goes for me - I''ll flag risks the moment I see them."},
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
  'Start with an empty canvas - write your own onboarding from scratch.',
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
