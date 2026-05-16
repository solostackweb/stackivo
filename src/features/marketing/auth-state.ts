import "server-only";

import { cache } from "react";
import { getServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/features/auth/server";
import type { PlanId } from "@/features/subscription/types";
import type { MarketingAuthState } from "./types";

/**
 * Resolve the marketing auth context (anon / authed + plan + upgrade nudge).
 *
 * Wrapped in React's request-scoped `cache()` so that layout, page, and any
 * marketing sub-routes (e.g. `/pricing`) all share a SINGLE auth lookup +
 * subscription query per request, instead of duplicating both round-trips.
 */
export const getMarketingAuthState = cache(
  async (): Promise<MarketingAuthState> => {
    const user = await getCurrentUser();

    if (!user) {
      return {
        isAuthenticated: false,
        plan: null,
        showUpgradeNudge: false,
      };
    }

    const supabase = await getServerSupabase();
    const { data } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();

    const row = data as { plan: PlanId } | null;
    const plan = row?.plan ?? "free";

    return {
      isAuthenticated: true,
      plan,
      showUpgradeNudge: plan === "free",
    };
  },
);
