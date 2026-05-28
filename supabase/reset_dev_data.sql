-- ═══════════════════════════════════════════════════════════════════════════
-- STACKIVO — Development Data Reset
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PURPOSE: Wipe all user-generated data so you can start onboarding fresh.
--
-- PRESERVED (untouched):
--   ✅ auth.users              → your login still works
--   ✅ welcome_document_templates WHERE is_system = true
--   ✅ platform_settings       → global config / feature flags
--   ✅ All table schemas, RLS policies, functions, triggers
--
-- DELETED:
--   🗑  All clients, invoices, projects, time entries, contracts
--   🗑  All billing records, subscriptions, delivery logs
--   🗑  All portal data, notifications, activity
--   🗑  All user profiles  → forces fresh onboarding on next login
--   🗑  User-created welcome document templates
--
-- AFTER RUNNING:
--   Log in at /login → you will be redirected to /onboarding automatically.
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → paste → Run
--   (Runs as postgres superuser, which is required for session_replication_role)
--
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 0. Snapshot what we're about to preserve (for the confirmation message)
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  sys_template_count  INT;
  auth_user_count     INT;
  platform_cfg_count  INT;
BEGIN
  SELECT COUNT(*) INTO sys_template_count  FROM welcome_document_templates WHERE is_system = true;
  SELECT COUNT(*) INTO auth_user_count     FROM auth.users;
  SELECT COUNT(*) INTO platform_cfg_count  FROM platform_settings;

  RAISE NOTICE '══════════════════════════════════════════';
  RAISE NOTICE ' Stackivo dev reset — starting';
  RAISE NOTICE '══════════════════════════════════════════';
  RAISE NOTICE ' Will preserve:';
  RAISE NOTICE '   auth.users            : %', auth_user_count;
  RAISE NOTICE '   system templates      : %', sys_template_count;
  RAISE NOTICE '   platform_settings rows: %', platform_cfg_count;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Disable FK enforcement for this session
--    (lets us delete in a readable order without CASCADE headaches)
-- ─────────────────────────────────────────────────────────────────────────
SET session_replication_role = 'replica';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Referral system
-- ─────────────────────────────────────────────────────────────────────────
DELETE FROM referral_events;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Portal sub-tables  (most nested first)
-- ─────────────────────────────────────────────────────────────────────────
DELETE FROM portal_welcome_documents;
DELETE FROM portal_notification_outbox;
DELETE FROM portal_update_reactions;
DELETE FROM portal_updates;
DELETE FROM portal_meetings;
DELETE FROM portal_contracts;
DELETE FROM portal_invoices;
DELETE FROM portal_files;
DELETE FROM portal_messages;
DELETE FROM portal_activity;
DELETE FROM portal_storage_usage;
DELETE FROM portal_invitations;
DELETE FROM portal_members;
DELETE FROM portals;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Welcome documents
--    ⚠️  Only delete user-created templates. System templates are kept.
-- ─────────────────────────────────────────────────────────────────────────
DELETE FROM welcome_document_acknowledgements;
DELETE FROM welcome_document_views;
DELETE FROM welcome_documents;
DELETE FROM welcome_document_templates
  WHERE is_system = false
     OR user_id IS NOT NULL;   -- belt-and-suspenders: catches any row that
                                -- has an owner even if is_system was set wrong

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Invoice sub-tables
-- ─────────────────────────────────────────────────────────────────────────
DELETE FROM invoice_manual_confirmations;
DELETE FROM invoice_receipts;
DELETE FROM invoice_payment_attempts;
DELETE FROM invoice_items;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Contract sub-tables
-- ─────────────────────────────────────────────────────────────────────────
DELETE FROM contract_signatures;

-- ─────────────────────────────────────────────────────────────────────────
-- 7. Core business entities
-- ─────────────────────────────────────────────────────────────────────────
DELETE FROM time_entries;
DELETE FROM invoices;
DELETE FROM contracts;
DELETE FROM projects;
DELETE FROM clients;
DELETE FROM files;

-- ─────────────────────────────────────────────────────────────────────────
-- 8. Billing & subscriptions
-- ─────────────────────────────────────────────────────────────────────────
DELETE FROM billing_events;
DELETE FROM billing_payments;
DELETE FROM usage_counters;
DELETE FROM subscriptions;

-- ─────────────────────────────────────────────────────────────────────────
-- 9. Notifications, audit, and delivery logs
-- ─────────────────────────────────────────────────────────────────────────
DELETE FROM activity_events;
DELETE FROM notifications;
DELETE FROM admin_notes;
DELETE FROM admin_actions;
DELETE FROM security_events;
DELETE FROM delivery_logs;
DELETE FROM email_suppressions;

-- ─────────────────────────────────────────────────────────────────────────
-- 10. User profiles  (last — deleting this forces re-onboarding on login)
-- ─────────────────────────────────────────────────────────────────────────
DELETE FROM user_profiles;

-- ─────────────────────────────────────────────────────────────────────────
-- 11. Re-enable FK enforcement
-- ─────────────────────────────────────────────────────────────────────────
SET session_replication_role = 'origin';

-- ─────────────────────────────────────────────────────────────────────────
-- 12. Confirmation
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  sys_templates_remaining  INT;
  auth_users_remaining     INT;
  platform_cfg_remaining   INT;
  user_profiles_remaining  INT;
  clients_remaining        INT;
  invoices_remaining       INT;
BEGIN
  SELECT COUNT(*) INTO sys_templates_remaining  FROM welcome_document_templates WHERE is_system = true;
  SELECT COUNT(*) INTO auth_users_remaining     FROM auth.users;
  SELECT COUNT(*) INTO platform_cfg_remaining   FROM platform_settings;
  SELECT COUNT(*) INTO user_profiles_remaining  FROM user_profiles;
  SELECT COUNT(*) INTO clients_remaining        FROM clients;
  SELECT COUNT(*) INTO invoices_remaining       FROM invoices;

  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════';
  RAISE NOTICE ' ✅ Reset complete';
  RAISE NOTICE '══════════════════════════════════════════';
  RAISE NOTICE ' Preserved:';
  RAISE NOTICE '   auth.users            : % (login still works)', auth_users_remaining;
  RAISE NOTICE '   system templates      : % (should be > 0)',     sys_templates_remaining;
  RAISE NOTICE '   platform_settings     : %',                     platform_cfg_remaining;
  RAISE NOTICE ' Cleared:';
  RAISE NOTICE '   user_profiles         : % (should be 0)',       user_profiles_remaining;
  RAISE NOTICE '   clients               : % (should be 0)',       clients_remaining;
  RAISE NOTICE '   invoices              : % (should be 0)',       invoices_remaining;
  RAISE NOTICE '';
  RAISE NOTICE ' Next step: log in at /login';
  RAISE NOTICE ' You will be sent to /onboarding automatically.';
END $$;

COMMIT;
