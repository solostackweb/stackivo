import "server-only";

/**
 * Server-side subscription + feature-gate helpers.
 *
 * These are the functions you reach for from Server Components, route
 * handlers, and server actions. They resolve the caller's subscription and
 * usage from Supabase, then delegate to the pure helpers in `./features.ts`.
 *
 * IMPORTANT: every helper here validates the current user via
 * `supabase.auth.getUser()` before touching the DB — never trust a `userId`
 * passed from client code.
 */

import { cache } from "react";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/features/auth/server";
import { AUTH_LOGIN_ROUTE } from "@/features/auth/routes";
import { paywallsDisabled } from "./paywalls";
import {
  effectivePlan,
  hasFeature,
  hasModule,
  limitFor,
  toUsageSnapshot,
  withinLimit,
} from "./features";
import { minimumPlanFor } from "./plans";
import type {
  CurrentSubscription,
  FeatureKey,
  ModuleKey,
  UsageMetric,
  UsageSnapshot,
} from "./types";

// --- Loaders ----------------------------------------------------------------

/**
 * Returns the current user's subscription, or `null` when unauthenticated.
 *
 * Because the DB trigger `on_user_profile_created` auto-provisions a `free`
 * subscription row for every new user, an authenticated user will almost
 * always have a row. We still return `null` defensively if the row is
 * missing so callers can fall through to `free` entitlements.
 */
export const getCurrentSubscription = cache(
  async (): Promise<CurrentSubscription | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as unknown as import("@/lib/supabase/types").SubscriptionRow;
    return {
      userId: row.user_id,
      plan: row.plan,
      status: row.status,
      trialEndsAt: row.trial_ends_at,
      currentPeriodEnd: row.current_period_end,
      razorpaySubscriptionId: row.razorpay_subscription_id,
    };
  },
);

/** Returns the authenticated user's usage snapshot for a given metric. */
export async function getUsageSnapshot(
  metric: UsageMetric,
): Promise<UsageSnapshot | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await getServerSupabase();

  const now = new Date();
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  ).toISOString();

  const [{ data }, sub] = await Promise.all([
    readActualUsageCount(supabase, user.id, metric, periodStart),
    getCurrentSubscription(),
  ]);

  return toUsageSnapshot({
    sub,
    metric,
    used: data,
    periodStart,
    periodEnd,
  });
}

type ServerSupabase = Awaited<ReturnType<typeof getServerSupabase>>;

async function readActualUsageCount(
  supabase: ServerSupabase,
  userId: string,
  metric: UsageMetric,
  periodStart: string,
): Promise<{ data: number }> {
  if (metric === "clients_created") {
    const { data } = await supabase
      .from("user_profiles")
      .select("lifetime_clients_created")
      .eq("id", userId)
      .maybeSingle();
    return {
      data:
        (data as { lifetime_clients_created?: number } | null)
          ?.lifetime_clients_created ?? 0,
    };
  }

  if (metric === "invoices_created") {
    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", periodStart);
    return { data: count ?? 0 };
  }

  if (metric === "projects_created") {
    const { count } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", periodStart);
    return { data: count ?? 0 };
  }

  if (metric === "contracts_sent") {
    const { count } = await supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", periodStart)
      .neq("status", "draft");
    return { data: count ?? 0 };
  }

  const { data } = await supabase
    .from("usage_counters")
    .select("count")
    .eq("user_id", userId)
    .eq("metric", metric)
    .eq("period_start", periodStart)
    .maybeSingle();

  return {
    data: (data as { count?: number } | null)?.count ?? 0,
  };
}

// --- Feature gates (server) -------------------------------------------------

export async function canUseFeature(feature: FeatureKey): Promise<boolean> {
  const sub = await getCurrentSubscription();
  return hasFeature(sub, feature);
}

export async function canAccessModule(module: ModuleKey): Promise<boolean> {
  const sub = await getCurrentSubscription();
  if (paywallsDisabled()) return true;
  return hasModule(sub, module);
}

export async function requireModule(
  module: ModuleKey,
  redirectTo?: string,
): Promise<CurrentSubscription> {
  const sub = await getCurrentSubscription();
  if (!sub) redirect(AUTH_LOGIN_ROUTE);
  if (paywallsDisabled()) return sub;
  if (hasModule(sub, module)) return sub;

  const fallback = `/dashboard/settings/billing?module=${encodeURIComponent(
    module,
  )}`;
  redirect(redirectTo ?? fallback);
}

/**
 * Throws (via redirect) if the caller isn't entitled to the feature. Use
 * inside server actions to hard-stop mutations:
 *
 *   await requireFeature("contracts.e_signature");
 *
 * When `redirectTo` is omitted we redirect to
 * `/dashboard/settings/billing?upgrade=<feature>` so the UI can surface
 * a contextual upgrade prompt.
 */
export async function requireFeature(
  feature: FeatureKey,
  redirectTo?: string,
): Promise<CurrentSubscription> {
  const sub = await getCurrentSubscription();
  if (!sub) redirect(AUTH_LOGIN_ROUTE);
  // Open-beta kill-switch — see `./paywalls.ts`. When paywalls are
  // disabled we hand back the current sub unchanged so callers continue
  // to receive a typed `CurrentSubscription`, but skip the entitlement
  // check entirely.
  if (paywallsDisabled()) return sub;
  if (hasFeature(sub, feature)) return sub;

  const suggested = minimumPlanFor(feature);
  const fallback = `/dashboard/settings/billing?upgrade=${encodeURIComponent(
    feature,
  )}${suggested ? `&plan=${suggested}` : ""}`;
  redirect(redirectTo ?? fallback);
}

/**
 * Server action / route-handler guard for usage caps.
 *
 * Returns the up-to-date snapshot. Throws (via redirect to upgrade page)
 * when adding `delta` would exceed the monthly limit.
 */
export async function requireWithinLimit(
  metric: UsageMetric,
  delta = 1,
  redirectTo?: string,
): Promise<UsageSnapshot> {
  const snapshot = await getUsageSnapshot(metric);
  const sub = await getCurrentSubscription();
  if (!snapshot) redirect(AUTH_LOGIN_ROUTE);

  // Open-beta kill-switch — skip the cap check but still return the
  // snapshot so analytics surfaces continue to see real usage numbers.
  if (paywallsDisabled()) return snapshot;

  if (!withinLimit(sub, metric, snapshot.used, delta)) {
    const fallback = `/dashboard/settings/billing?limit=${encodeURIComponent(
      metric,
    )}`;
    redirect(redirectTo ?? fallback);
  }
  return snapshot;
}

// --- Re-exports for convenience --------------------------------------------
export { effectivePlan, hasFeature, hasModule, limitFor };
