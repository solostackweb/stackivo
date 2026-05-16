"use client";

import * as React from "react";
import { useSubscription } from "../hooks/use-subscription";
import type { FeatureKey } from "../types";

/**
 * Client-side UI gate for a feature flag.
 *
 * Renders `children` only when the authenticated user's plan grants
 * `feature`. `fallback` (typically an `<UpgradeCard/>`) is shown otherwise.
 * While the subscription is loading, renders nothing — server-rendered
 * gates should be used for above-the-fold content.
 */
export function FeatureGate({
  feature,
  children,
  fallback = null,
}: {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { status, canUse } = useSubscription();
  if (status !== "ready") return null;
  return canUse(feature) ? <>{children}</> : <>{fallback}</>;
}
