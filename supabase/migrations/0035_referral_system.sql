-- 0035_referral_system.sql
--
-- Adds a simple peer-referral system:
--   • user_profiles.referral_code   — unique shareable code per user
--   • user_profiles.referred_by     — which user recruited this one
--   • user_profiles.referral_count  — lifetime successful referrals
--   • referral_events               — audit log of each referral
--
-- Reward mechanic (enforced by application layer, not DB):
--   Referrer: +1 month Pro free per completed referral (max 12)
--   Referred: +1 month Pro free on completing onboarding
--
-- A referral is "completed" when:
--   referred user's onboarding_completed flips to true
--   (enforced by application code calling apply_referral_completion())

-- ─── 1. Extend user_profiles ─────────────────────────────────────────────────

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS referral_code    TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by      UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_count   INT NOT NULL DEFAULT 0;

-- Back-fill existing users with a unique 8-char code (base36).
UPDATE user_profiles
SET referral_code = UPPER(SUBSTRING(MD5(id::text || 'stackivo-ref') FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- Make it NOT NULL after back-fill.
ALTER TABLE user_profiles
  ALTER COLUMN referral_code SET NOT NULL;

-- Auto-generate referral_code on insert (for new users).
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := UPPER(SUBSTRING(MD5(NEW.id::text || clock_timestamp()::text) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_referral_code ON user_profiles;
CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code();

-- ─── 2. referral_events table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS referral_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id   UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  referred_id   UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  -- "pending" = referred user signed up but hasn't completed onboarding yet
  -- "completed" = onboarding done, rewards granted
  -- "cancelled" = referred account deleted
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'completed', 'cancelled')),
  reward_months INT NOT NULL DEFAULT 0,  -- months actually granted so far
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  UNIQUE (referred_id)  -- one referrer per referred user
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referral_events_referrer ON referral_events (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_status    ON referral_events (referrer_id, status);

-- ─── 3. RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE referral_events ENABLE ROW LEVEL SECURITY;

-- Users can see events where they are the referrer.
CREATE POLICY "referral_events_select_own"
  ON referral_events FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- Only server (service-role / admin) may insert/update.
-- Application code uses getAdminSupabase() for mutations.
CREATE POLICY "referral_events_no_client_write"
  ON referral_events FOR INSERT
  WITH CHECK (false);

CREATE POLICY "referral_events_no_client_update"
  ON referral_events FOR UPDATE
  USING (false);
