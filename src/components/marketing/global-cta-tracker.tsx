"use client";

/**
 * Document-level click tracker for marketing CTAs.
 *
 * Why: the hero, CTA band, and most marketing CTAs are server-rendered
 * `<Link>` elements. Wrapping them in client components just for
 * tracking would regress LCP. Instead we attach a single capturing
 * listener at the layout level that fires `marketing.cta.clicked`
 * whenever a `<a data-cta="...">` anchor is clicked.
 *
 * Authors annotate any anchor that should be tracked:
 *
 *   <Link href="/signup" data-cta="hero_primary">Start free</Link>
 *
 * The `data-cta` value becomes the `location` property in the event,
 * giving us per-surface attribution for the funnel. Anchors without
 * `data-cta` are ignored.
 */

import * as React from "react";
import { useTrack } from "@/lib/analytics/track";

export function GlobalCtaTracker() {
  const track = useTrack();

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = (e.target as Element | null)?.closest(
        "a[data-cta]",
      ) as HTMLAnchorElement | null;
      if (!target) return;
      const location = target.getAttribute("data-cta");
      if (!location) return;
      // Strip query / hash so the label stays clean across UTM-tagged
      // links. We capture the path only.
      let href = "";
      try {
        const url = new URL(target.href, window.location.origin);
        href = url.pathname;
      } catch {
        href = target.getAttribute("href") ?? "";
      }
      track("marketing.cta.clicked", {
        location,
        label: target.innerText.slice(0, 80) || "",
        href,
      });
    };
    document.addEventListener("click", handler, { capture: true });
    return () => document.removeEventListener("click", handler, { capture: true });
  }, [track]);

  return null;
}
