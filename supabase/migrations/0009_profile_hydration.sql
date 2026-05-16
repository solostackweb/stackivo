-- =============================================================================
-- 0009_profile_hydration.sql — Profile + branding fields for app-wide hydration
-- -----------------------------------------------------------------------------
-- Adds profile/branding/contact fields needed for settings sync + document
-- branding. These columns live on `user_profiles` to keep a single source of
-- truth per user.
-- =============================================================================

alter table public.user_profiles
  add column if not exists display_name text,
  add column if not exists phone text,
  add column if not exists role text,
  add column if not exists bio text,
  add column if not exists business_email text,
  add column if not exists business_phone text,
  add column if not exists website text,
  add column if not exists logo_url text,
  add column if not exists brand_icon_url text,
  add column if not exists brand_color text,
  add column if not exists brand_tagline text,
  add column if not exists brand_signature text,
  add column if not exists brand_intro text,
  add column if not exists invoice_number_padding int not null default 4,
  add column if not exists invoice_reset_yearly boolean not null default false,
  add column if not exists invoice_default_tax_mode text not null default 'intra'
    check (invoice_default_tax_mode in ('intra','inter')),
  add column if not exists invoice_default_gst_rate int not null default 18,
  add column if not exists invoice_send_reminders boolean not null default true;
