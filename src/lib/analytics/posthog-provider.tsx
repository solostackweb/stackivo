"use client";

/**
 * Client-side PostHog provider.
 *
 * - No-ops cleanly when `NEXT_PUBLIC_POSTHOG_KEY` is unset so dev /
 *   preview deploys skip analytics without a try-catch ceremony.
 * - Disables Autocapture. We rely on explicit `trackEvent()` calls so
 *   event names stay curated and no-PII by default.
 * - Captures pageviews manually on route change since App Router
 *   doesn't fire a single "navigation" event PostHog can hook into.
 */

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { env } from "@/config/env";

type PostHogClient = {
  init: (key: string, opts: Record<string, unknown>) => void;
  capture: (event: string, props?: Record<string, unknown>) => void;
  identify: (distinctId: string, props?: Record<string, unknown>) => void;
  reset: () => void;
};

const PostHogCtx = React.createContext<PostHogClient | null>(null);

export function usePostHog(): PostHogClient | null {
  return React.useContext(PostHogCtx);
}

/**
 * Mount near the root of the tree (inside AppProviders). When
 * PostHog isn't configured, renders children unchanged with a
 * `null` context value so callers can safely `const ph = usePostHog(); ph?.capture(...)`.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = React.useState<PostHogClient | null>(null);

  React.useEffect(() => {
    if (!env.posthogKey) return;
    let cancelled = false;
    void (async () => {
      const mod = await import("posthog-js");
      const posthog = (mod as unknown as { default: PostHogClient }).default;
      if (cancelled) return;
      posthog.init(env.posthogKey, {
        api_host: env.posthogHost,
        // We send pageviews manually below.
        capture_pageview: false,
        // Autocapture is opinionated; we track explicitly.
        autocapture: false,
        // Session replay is opt-in in PostHog dashboard — SDK does
        // nothing here until you flip it on.
        disable_session_recording: false,
        // Respect user DNT as a sensible default.
        respect_dnt: true,
        persistence: "localStorage+cookie",
        loaded: (ph: PostHogClient) => setClient(ph),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PostHogCtx.Provider value={client}>
      <PageviewTracker client={client} />
      {children}
    </PostHogCtx.Provider>
  );
}

/**
 * Manual $pageview capture on every App Router navigation.
 * Renders nothing.
 */
function PageviewTracker({ client }: { client: PostHogClient | null }) {
  const pathname = usePathname();
  const search = useSearchParams();
  React.useEffect(() => {
    if (!client) return;
    const url = search?.toString()
      ? `${pathname}?${search.toString()}`
      : pathname;
    client.capture("$pageview", { $current_url: url });
  }, [client, pathname, search]);
  return null;
}
