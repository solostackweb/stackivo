"use client";

import * as React from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type {
  CurrentSubscription,
  FeatureKey,
  ModuleKey,
} from "../types";
import { hasFeature, hasModule } from "../features";

type Status = "loading" | "ready" | "error";

export interface UseSubscriptionResult {
  status: Status;
  subscription: CurrentSubscription | null;
  canUse: (feature: FeatureKey) => boolean;
  canAccess: (module: ModuleKey) => boolean;
  refresh: () => Promise<void>;
}

/**
 * Client hook to access the current user's subscription.
 *
 * Subscribes to auth state changes so logging out / switching tabs reflects
 * immediately. For server-rendered entitlements, prefer reading from
 * `@/features/subscription/server` and passing the result down as a prop.
 */
export function useSubscription(): UseSubscriptionResult {
  const [state, setState] = React.useState<{
    status: Status;
    subscription: CurrentSubscription | null;
  }>({ status: "loading", subscription: null });

  const load = React.useCallback(async () => {
    const supabase = getBrowserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setState({ status: "ready", subscription: null });
      return;
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setState({ status: "error", subscription: null });
      return;
    }

    const row = data as unknown as
      | import("@/lib/supabase/types").SubscriptionRow
      | null;

    setState({
      status: "ready",
      subscription: row
        ? {
            userId: row.user_id,
            plan: row.plan,
            status: row.status,
            trialEndsAt: row.trial_ends_at,
            currentPeriodEnd: row.current_period_end,
            razorpaySubscriptionId: row.razorpay_subscription_id,
          }
        : null,
    });
  }, []);

  React.useEffect(() => {
    void load();
    const supabase = getBrowserSupabase();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const canUse = React.useCallback(
    (feature: FeatureKey) => hasFeature(state.subscription, feature),
    [state.subscription],
  );
  const canAccess = React.useCallback(
    (module: ModuleKey) => hasModule(state.subscription, module),
    [state.subscription],
  );

  return {
    status: state.status,
    subscription: state.subscription,
    canUse,
    canAccess,
    refresh: load,
  };
}
