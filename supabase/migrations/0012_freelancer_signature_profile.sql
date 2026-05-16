-- =============================================================================
-- 0012_freelancer_signature_profile.sql — Freelancer signature profile fields
-- =============================================================================
-- Adds a first-class freelancer signature to user_profiles and extends the
-- onboarding step machine so every new freelancer configures a signature.
-- =============================================================================

alter table public.user_profiles
  add column if not exists signature_type text
    check (signature_type is null or signature_type in ('draw', 'type', 'upload')),
  add column if not exists signature_image_url text,
  add column if not exists signature_text_value text,
  add column if not exists signature_font_family text,
  add column if not exists signature_updated_at timestamptz;

do $$ begin
  alter table public.user_profiles
    drop constraint if exists user_profiles_onboarding_step_check;
exception when undefined_object then null; end $$;

alter table public.user_profiles
  add constraint user_profiles_onboarding_step_check
  check (onboarding_step in ('business','gst','invoice','signature','first_client','done'));
