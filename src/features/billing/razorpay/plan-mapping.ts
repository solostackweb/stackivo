import "server-only";

/**
 * Bidirectional mapping between Stackivo plan ids and Razorpay plan ids.
 *
 * Razorpay plan ids are configured per-environment via env vars
 * (`RAZORPAY_PLAN_PRO_MONTHLY`, etc.) so the same code works against test
 * and live mode without redeploys. Plans must be created manually in the
 * Razorpay Dashboard before they can be used here.
 */

import { requireServerEnv } from "@/config/env";
import type { BillingCycle, SubscriptionPlanRow } from "@/lib/supabase/types";

export type PaidPlan = Exclude<SubscriptionPlanRow, "free">;

interface ResolvedPlan {
  plan: PaidPlan;
  cycle: BillingCycle;
  razorpayPlanId: string;
}

/**
 * Resolve the Razorpay plan id for a (plan, cycle) pair. Throws if the
 * env var is unset — callers should surface a "billing not configured"
 * error rather than passing through to the API.
 */
export function getRazorpayPlanId(plan: PaidPlan, cycle: BillingCycle): string {
  const env = requireServerEnv();
  const id = pickPlanId(env, plan, cycle);
  if (!id) {
    throw new Error(
      `[billing] Razorpay plan id not configured for ${plan}/${cycle}. ` +
        `Set RAZORPAY_PLAN_${plan.toUpperCase()}_${cycle.toUpperCase()}.`,
    );
  }
  return id;
}

/**
 * Reverse lookup: Razorpay plan id → (plan, cycle). Used by the webhook
 * handler when it receives subscription events that reference plan ids.
 */
export function findPlanByRazorpayId(razorpayPlanId: string): ResolvedPlan | null {
  const env = requireServerEnv();
  const all: ResolvedPlan[] = [];
  const matrix: Array<[PaidPlan, BillingCycle]> = [
    ["pro", "monthly"],
    ["pro", "yearly"],
    ["business", "monthly"],
    ["business", "yearly"],
  ];
  for (const [plan, cycle] of matrix) {
    const id = pickPlanId(env, plan, cycle);
    if (id) all.push({ plan, cycle, razorpayPlanId: id });
  }
  return all.find((p) => p.razorpayPlanId === razorpayPlanId) ?? null;
}

function pickPlanId(
  env: ReturnType<typeof requireServerEnv>,
  plan: PaidPlan,
  cycle: BillingCycle,
): string | undefined {
  if (plan === "pro" && cycle === "monthly") return env.razorpayPlanProMonthly;
  if (plan === "pro" && cycle === "yearly") return env.razorpayPlanProYearly;
  if (plan === "business" && cycle === "monthly")
    return env.razorpayPlanBusinessMonthly;
  if (plan === "business" && cycle === "yearly")
    return env.razorpayPlanBusinessYearly;
  return undefined;
}
