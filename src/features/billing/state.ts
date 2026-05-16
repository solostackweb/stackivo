/**
 * Pure state-machine helpers for the billing lifecycle.
 *
 * Maps Razorpay's subscription statuses onto Stackivo's
 * `SubscriptionStatusRow` union and derives the small set of UI-facing
 * lifecycle flags consumers care about (active, past_due, in grace, etc.).
 *
 * No I/O — safe to import from server and client.
 */

import type {
  SubscriptionPlanRow,
  SubscriptionStatusRow,
} from "@/lib/supabase/types";
import type { BillingLifecycle, BillingSubscription } from "./types";
import type { RazorpaySubscriptionStatus } from "./razorpay/client";

/**
 * Razorpay status → our normalised status. We collapse states we don't
 * meaningfully distinguish (e.g. `created` and `authenticated`) onto
 * `trialing` so the row exists and the user has read-only entitlements
 * until first capture.
 */
export function mapRazorpayStatus(
  rzp: RazorpaySubscriptionStatus,
): SubscriptionStatusRow {
  switch (rzp) {
    case "active":
      return "active";
    case "authenticated":
    case "created":
      return "trialing";
    case "pending":
    case "halted":
      return "past_due";
    case "paused":
      return "paused";
    case "cancelled":
      return "canceled";
    case "completed":
    case "expired":
      return "expired";
    default:
      return "active";
  }
}

/**
 * Lifecycle derived flags used by the billing dashboard + middleware-aware
 * banners. Keep this pure — the values are computed from the row state.
 */
export function deriveLifecycle(
  sub: BillingSubscription | null,
): BillingLifecycle {
  if (!sub) {
    return {
      isActive: false,
      isPastDue: false,
      isCanceledAtPeriodEnd: false,
      isInGracePeriod: false,
      daysUntilRenewal: null,
      daysUntilGraceEnds: null,
    };
  }

  const now = Date.now();
  const renewalAt = sub.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).getTime()
    : null;
  const graceAt = sub.gracePeriodEndsAt
    ? new Date(sub.gracePeriodEndsAt).getTime()
    : null;

  const isPastDue = sub.status === "past_due";
  const isInGracePeriod = isPastDue && graceAt !== null && now < graceAt;

  return {
    isActive: sub.status === "active" || sub.status === "trialing",
    isPastDue,
    isCanceledAtPeriodEnd: sub.cancelAtPeriodEnd,
    isInGracePeriod,
    daysUntilRenewal: renewalAt
      ? Math.max(0, Math.ceil((renewalAt - now) / 86_400_000))
      : null,
    daysUntilGraceEnds: graceAt
      ? Math.max(0, Math.ceil((graceAt - now) / 86_400_000))
      : null,
  };
}

/**
 * Whether the user keeps paid entitlements right now. Mirrors
 * `effectivePlan` in `@/features/subscription/features` but exposed in
 * billing terms. Past-due users get a 3-day grace period during which
 * paid features stay unlocked.
 */
export function entitledPlan(
  sub: BillingSubscription | null,
): SubscriptionPlanRow {
  if (!sub) return "free";
  if (sub.status === "active" || sub.status === "trialing") return sub.plan;
  if (sub.status === "past_due") {
    const graceAt = sub.gracePeriodEndsAt
      ? new Date(sub.gracePeriodEndsAt).getTime()
      : null;
    if (graceAt !== null && Date.now() < graceAt) return sub.plan;
  }
  return "free";
}
