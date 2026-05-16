-- =============================================================================
-- 0010_notification_preferences.sql — user-owned notification preferences
-- -----------------------------------------------------------------------------
-- Keeps settings/notifications backed by the existing user_profiles source of
-- truth instead of client-only defaults.
-- =============================================================================

alter table public.user_profiles
  add column if not exists notification_preferences jsonb not null default '{
    "emailInvoicePaid": true,
    "emailInvoiceViewed": true,
    "emailInvoiceOverdue": true,
    "emailClientCreated": false,
    "emailWeeklyDigest": true,
    "emailProductUpdates": false,
    "inAppPayments": true,
    "inAppClientActivity": true,
    "inAppContracts": true,
    "notificationEmail": "",
    "quietHours": "none",
    "batchNonUrgent": true
  }'::jsonb;
