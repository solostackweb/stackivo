"use client";

/**
 * Crisp Live Chat provider.
 *
 * Behaviour:
 *   - When `NEXT_PUBLIC_CRISP_WEBSITE_ID` is unset → renders nothing.
 *     This means dev / preview / unconfigured deploys ship without
 *     a chat widget at all (no broken icon, no console noise).
 *   - When set → injects the Crisp loader script once, configures
 *     `$crisp` global with our chosen toggles, and pushes the
 *     authenticated user's identity + key segments so every chat is
 *     pre-triaged.
 *
 * Identity payload deliberately includes only:
 *     email · nickname · user_id · plan · page
 *
 * It NEVER ships full address / payment / DPDP-sensitive fields.
 *
 * Mount this inside the dashboard layout (NOT in `<AppProviders/>`)
 * so the marketing site keeps the un-authenticated widget separate
 * from the authenticated identity bridge.
 */

import * as React from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { env } from "@/config/env";

declare global {
  interface Window {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
    CRISP_RUNTIME_CONFIG?: { locale?: string };
  }
}

export interface CrispIdentity {
  /** Authenticated user email — null for marketing/anon visitors. */
  email: string | null;
  /** Display name — falls back to email's local part when null. */
  nickname?: string | null;
  /** Stackivo user uuid — surfaced inline in the Crisp inbox. */
  userId?: string | null;
  /** Plan tier (free / pro / business). */
  plan?: string | null;
  /** Subscription MRR in INR — useful for triage. */
  mrr?: number | null;
}

interface Props {
  identity?: CrispIdentity;
}

/**
 * Loads Crisp once for the whole tab. Pushes identity + page segments
 * on every navigation so the founder always sees the active page in
 * the inbox.
 */
export function CrispProvider({ identity }: Props) {
  const pathname = usePathname();
  const websiteId = env.crispWebsiteId;

  // Stash the identity in a ref so the after-load effect can read the
  // latest value without re-running the script tag.
  const identityRef = React.useRef<CrispIdentity | undefined>(identity);
  identityRef.current = identity;

  React.useEffect(() => {
    if (!websiteId) return;
    if (typeof window === "undefined") return;
    if (!window.$crisp) return;

    const id = identityRef.current;

    // Identity push.
    if (id?.email) {
      window.$crisp.push(["set", "user:email", [id.email]]);
      const nick = id.nickname ?? id.email.split("@")[0];
      if (nick) window.$crisp.push(["set", "user:nickname", [nick]]);
    }

    // Session metadata: arrays of [key, value] tuples.
    const sessionData: Array<[string, string]> = [];
    if (id?.userId) sessionData.push(["user_id", id.userId]);
    if (id?.plan) sessionData.push(["plan", id.plan]);
    if (typeof id?.mrr === "number") {
      sessionData.push(["mrr", String(id.mrr)]);
    }
    sessionData.push(["page", pathname]);
    if (sessionData.length > 0) {
      window.$crisp.push(["set", "session:data", [sessionData]]);
    }

    // Segments — used for routing/automations on Crisp side.
    const segments = ["app"];
    if (id?.plan) segments.push(`plan:${id.plan}`);
    window.$crisp.push(["set", "session:segments", [segments]]);
  }, [pathname, websiteId]);

  if (!websiteId) return null;

  return (
    <>
      <Script
        id="crisp-bootstrap"
        strategy="afterInteractive"
        // Keep the bootstrap inline so it runs before the loader does.
        dangerouslySetInnerHTML={{
          __html: `
            window.$crisp = window.$crisp || [];
            window.CRISP_WEBSITE_ID = ${JSON.stringify(websiteId)};
            // Hide on small screens until the user opens it — the
            // floating <SupportButton/> is the canonical entry point
            // on mobile.
            window.$crisp.push(["safe", true]);
            // Sit BELOW our own floating support button (z-60). 40 puts
            // Crisp below modal/sheet overlays but above page content.
            window.$crisp.push(["config", "container:index", [40]]);
          `,
        }}
      />
      {/* On desktop: lift Crisp's bubble above the mobile bottom-nav
          reservation so it sits naturally in the corner.
          On mobile (≤768px): hide the ENTIRE Crisp client container.
          Crisp class names change across SDK versions so targeting the
          stable `.crisp-client` root is the most reliable approach.
          Users on mobile reach support via the "More → Chat with us"
          item in the navigation drawer. */}
      <style>
        {`
          .crisp-client { display: none !important; }
          @media (max-width: 768px) {
            .crisp-client { display: none !important; }
          }
        `}
      </style>
      <Script
        id="crisp-loader"
        src="https://client.crisp.chat/l.js"
        strategy="afterInteractive"
      />
    </>
  );
}

/**
 * Imperative helpers for opening / closing the chat panel from any
 * client component. No-ops cleanly when Crisp isn't loaded.
 */
export const crisp = {
  open() {
    if (typeof window === "undefined" || !window.$crisp) return;
    window.$crisp.push(["do", "chat:open"]);
  },
  close() {
    if (typeof window === "undefined" || !window.$crisp) return;
    window.$crisp.push(["do", "chat:close"]);
  },
  /** Drop a one-off bot message into the active session. */
  message(text: string) {
    if (typeof window === "undefined" || !window.$crisp) return;
    window.$crisp.push(["do", "message:show", ["text", text]]);
  },
  /** Push an extra session event (analytics-style). */
  event(name: string, data?: Record<string, unknown>) {
    if (typeof window === "undefined" || !window.$crisp) return;
    window.$crisp.push(["set", "session:event", [[[name, data ?? {}, "blue"]]]]);
  },
  /** Reset on logout so the next visitor doesn't inherit identity. */
  reset() {
    if (typeof window === "undefined" || !window.$crisp) return;
    window.$crisp.push(["do", "session:reset"]);
  },
};
