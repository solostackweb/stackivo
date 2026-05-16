"use client";

/**
 * Typed client-side analytics helper.
 *
 *   trackEvent("invoice.sent", { entity_id, amount_bucket: "1k_10k" });
 *
 * Call from any Client Component. No-ops when PostHog isn't
 * initialised (unset key, SSR render path, etc).
 */

import { usePostHog } from "./posthog-provider";
import type { AnalyticsEvent, AnalyticsProps } from "./events";

export function useTrack() {
  const ph = usePostHog();
  return function trackEvent(event: AnalyticsEvent, props?: AnalyticsProps) {
    if (!ph) return;
    ph.capture(event, props as Record<string, unknown> | undefined);
  };
}
