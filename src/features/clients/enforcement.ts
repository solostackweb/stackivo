import "server-only";

/**
 * Free-plan enforcement for client creation.
 *
 * Per BRD / current `PLANS.free.limits.clients_created`, free users can
 * only create a fixed number of LIFETIME clients (deletes don't reduce
 * the counter). The lifetime counter lives on `user_profiles
 * .lifetime_clients_created` and is bumped by the SQL trigger
 * `clients_increment_lifetime` declared in 0005.
 */

import { getServerSupabase } from "@/lib/supabase/server";
import { getCurrentSubscription } from "@/features/subscription/server";
import { getPlan } from "@/features/subscription/plans";
import type { CurrentSubscription } from "@/features/subscription/types";

export interface ClientLimitStatus {
  used: number;
  /** `Infinity` for paid plans. */
  limit: number;
  remaining: number;
  /** True when creation must be blocked. */
  blocked: boolean;
  /** Lowest plan that grants more capacity, when blocked. */
  upgradeTo: "pro" | "business" | null;
}

function effectivePlanFromSub(sub: CurrentSubscription | null) {
  if (!sub) return "free" as const;
  if (sub.status === "canceled" || sub.status === "expired") return "free" as const;
  return sub.plan;
}

/**
 * Reads the user's lifetime client count + their current plan and returns
 * a structured limit status. Returns `null` when unauthenticated.
 */
export async function getClientLimitStatus(): Promise<ClientLimitStatus | null> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, sub] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("lifetime_clients_created")
      .eq("id", user.id)
      .maybeSingle(),
    getCurrentSubscription(),
  ]);

  const used =
    (profile as { lifetime_clients_created?: number } | null)
      ?.lifetime_clients_created ?? 0;
  const planId = effectivePlanFromSub(sub);
  const limit = getPlan(planId).limits.clients_created;
  const blocked = limit !== Infinity && used >= limit;
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - used);

  return {
    used,
    limit,
    remaining,
    blocked,
    upgradeTo: blocked ? "pro" : null,
  };
}

/**
 * Throws (returns a typed error result) when the user can't create another
 * client. Use INSIDE a server action right before insertion:
 *
 *   const blocked = await assertCanCreateClient();
 *   if (blocked) return blocked;
 */
export async function assertCanCreateClient(): Promise<
  | null
  | {
      ok: false;
      error: string;
      reason: "limit_exceeded";
      status: ClientLimitStatus;
    }
> {
  const status = await getClientLimitStatus();
  if (!status) {
    return { ok: false, error: "Not authenticated.", reason: "limit_exceeded", status: { used: 0, limit: 0, remaining: 0, blocked: true, upgradeTo: null } };
  }
  if (!status.blocked) return null;
  return {
    ok: false,
    reason: "limit_exceeded",
    status,
    error: `You've reached your free plan's lifetime client limit of ${status.limit}. Upgrade to add more.`,
  };
}
