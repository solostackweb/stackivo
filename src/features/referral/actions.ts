"use server";

/**
 * Referral server actions.
 *
 * These are called from:
 *   - The /register page (after signup, via a cookie-stored ref code)
 *   - The referral card UI (copy link — no server action, just clipboard)
 */

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getServerSupabase } from "@/lib/supabase/server";
import { resolveReferralCode, recordReferral } from "./server";

export type ReferralActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Stores the referral code in a cookie so it survives through the
 * signup flow. Call this from a client component / middleware that
 * detects `?ref=` in the URL.
 *
 * TTL: 30 days.
 */
export async function storeReferralCodeAction(code: string): Promise<void> {
  if (!code || code.length > 20) return;
  const cookieStore = await cookies();
  cookieStore.set("stackivo_ref", code.trim().toUpperCase(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
}

/**
 * After signup, call this to apply any pending referral code from the
 * cookie to the newly-created user.
 *
 * Designed to be called once during onboarding (step: business) where
 * we know the user's profile exists.
 */
export async function applyPendingReferralAction(): Promise<ReferralActionResult> {
  const cookieStore = await cookies();
  const code = cookieStore.get("stackivo_ref")?.value;
  if (!code) return { ok: false, error: "No referral code pending." };

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const referrerId = await resolveReferralCode(code);
  if (!referrerId) {
    // Invalid code — clear the cookie silently.
    cookieStore.delete("stackivo_ref");
    return { ok: false, error: "Invalid referral code." };
  }

  await recordReferral(user.id, referrerId);

  // Clear the cookie — we've used it.
  cookieStore.delete("stackivo_ref");

  revalidatePath("/dashboard");
  return { ok: true, message: "Referral applied." };
}
