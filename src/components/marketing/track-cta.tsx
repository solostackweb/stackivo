"use client";

/**
 * Tiny client-side helper that fires `marketing.cta.clicked` events
 * with a `location` property for funnel attribution. Used as a
 * drop-in wrapper around `<Link>`-style anchors via render props,
 * but most surfaces just call `useTrackCta()` and bind to onClick.
 */

import { useTrack } from "@/lib/analytics/track";

export function useTrackCta() {
  const track = useTrack();
  return function trackCta(
    location: string,
    label?: string,
    extra?: Record<string, string>,
  ) {
    track("marketing.cta.clicked", {
      location,
      label: label ?? "",
      ...(extra ?? {}),
    });
  };
}
