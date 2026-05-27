import "server-only";

/**
 * Referral system — server queries.
 *
 * Key concepts:
 *   referral_code  — unique 8-char code on every user_profile.
 *   referred_by    — set once when a user signs up via another user's link.
 *   referral_count — number of this user's referrals that reached `completed`.
 *
 * A referral becomes `completed` when the referred user finishes onboarding.
 * That is handled by `completeReferralForUser()`, called from the onboarding
 * completion flow.
 *
 * Rewards (enforced by application — not DB constraints):
 *   Referrer: +1 month Pro free per completed referral (capped at 12)
 *   Referred: +1 month Pro free on first onboarding completion
 */

import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { ReferralEventRow } from "@/lib/supabase/types";

export interface ReferralStatus {
  referralCode: string;
  referralLink: string;
  referralCount: number;
  pendingCount: number;
  completedCount: number;
  rewardMonthsEarned: number;
  events: Pick<ReferralEventRow, "referred_id" | "status" | "reward_months" | "created_at" | "completed_at">[];
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://stackivo.me";

/**
 * Returns the current user's referral status (code, link, counts, rewards).
 * Returns null if unauthenticated.
 */
export async function getReferralStatus(): Promise<ReferralStatus | null> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("referral_code, referral_count")
    .eq("id", user.id)
    .maybeSingle();

  const p = profile as { referral_code?: string | null; referral_count?: number | null } | null;
  if (!p?.referral_code) return null;

  const { data: events } = await supabase
    .from("referral_events")
    .select("referred_id, status, reward_months, created_at, completed_at")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const evts = (events ?? []) as Pick<ReferralEventRow, "referred_id" | "status" | "reward_months" | "created_at" | "completed_at">[];

  const pendingCount = evts.filter((e) => e.status === "pending").length;
  const completedCount = evts.filter((e) => e.status === "completed").length;
  const rewardMonthsEarned = evts.reduce((sum, e) => sum + (e.reward_months ?? 0), 0);

  return {
    referralCode: p.referral_code,
    referralLink: `${APP_URL}/register?ref=${p.referral_code}`,
    referralCount: p.referral_count ?? 0,
    pendingCount,
    completedCount,
    rewardMonthsEarned,
    events: evts,
  };
}

/**
 * Looks up a referral code and returns the referrer's user id.
 * Returns null if the code is invalid.
 */
export async function resolveReferralCode(code: string): Promise<string | null> {
  const admin = getAdminSupabase();
  const { data } = await admin
    .from("user_profiles")
    .select("id")
    .eq("referral_code", code.trim().toUpperCase())
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

/**
 * Records that `referredUserId` was referred by `referrerUserId`.
 * Should be called once after a new user's profile is created if a valid
 * referral code was present in the signup flow.
 *
 * Idempotent: if the referred user already has a `referred_by`, this is
 * a no-op (a user can only be referred once).
 */
export async function recordReferral(
  referredUserId: string,
  referrerUserId: string,
): Promise<void> {
  const admin = getAdminSupabase();

  // Check if already referred.
  const { data: existing } = await admin
    .from("user_profiles")
    .select("referred_by")
    .eq("id", referredUserId)
    .maybeSingle();
  if ((existing as { referred_by?: string | null } | null)?.referred_by) return;

  // Don't allow self-referral.
  if (referredUserId === referrerUserId) return;

  await admin
    .from("user_profiles")
    .update({ referred_by: referrerUserId } as never)
    .eq("id", referredUserId);

  await admin.from("referral_events").insert({
    referrer_id: referrerUserId,
    referred_id: referredUserId,
    status: "pending",
  } as never);
}

/**
 * Called when `referredUserId` completes onboarding. Marks the referral
 * event as completed, increments the referrer's count, and records reward
 * months for both parties.
 *
 * Rewards:
 *   Referred user: 1 month Pro (recorded on their subscription, handled externally)
 *   Referrer:      1 month Pro per successful referral, capped at 12 total
 */
export async function completeReferralForUser(referredUserId: string): Promise<void> {
  const admin = getAdminSupabase();

  const { data: event } = await admin
    .from("referral_events")
    .select("id, referrer_id, status, reward_months")
    .eq("referred_id", referredUserId)
    .maybeSingle();

  const e = event as { id?: string; referrer_id?: string; status?: string; reward_months?: number } | null;
  if (!e?.id || e.status !== "pending") return;

  // Mark event completed.
  await admin
    .from("referral_events")
    .update({
      status: "completed",
      reward_months: 1,
      completed_at: new Date().toISOString(),
    } as never)
    .eq("id", e.id);

  // Increment the referrer's count.
  if (e.referrer_id) {
    const { data: referrerProfile } = await admin
      .from("user_profiles")
      .select("referral_count")
      .eq("id", e.referrer_id)
      .maybeSingle();
    const currentCount =
      (referrerProfile as { referral_count?: number } | null)?.referral_count ?? 0;

    await admin
      .from("user_profiles")
      .update({ referral_count: currentCount + 1 } as never)
      .eq("id", e.referrer_id);
  }
}
