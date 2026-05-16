"use client";

/**
 * Microsoft Clarity loader.
 *
 * Free, unlimited heatmaps + click + scroll + session replay. We use
 * it as a complement to PostHog: PostHog for funnels and explicit
 * events, Clarity for "why is the click rate on the hero CTA so low?"
 * exploratory analysis.
 *
 * Behaviour:
 *   - When `NEXT_PUBLIC_CLARITY_PROJECT_ID` is unset → renders nothing.
 *     Dev / preview deploys ship without Clarity.
 *   - When set → injects the official `clarity.ms/tag/<id>` loader
 *     script with Next's `<Script strategy="afterInteractive"/>` so
 *     it doesn't block first paint or interaction.
 *
 * Privacy: Clarity respects DNT by default and we don't send any
 * personally-identifiable data into it. Set masking rules from the
 * Clarity dashboard (Settings → Masking) for fields like invoice
 * amounts if you want extra strictness.
 */

import * as React from "react";
import Script from "next/script";
import { env } from "@/config/env";

export function ClarityProvider() {
  const projectId = env.clarityProjectId;
  if (!projectId) return null;

  // Clarity's official snippet, inlined. The loader is tiny (~2KB) so
  // there's no benefit to lazy-loading further than `afterInteractive`.
  // Keep this snippet aligned with what Clarity's dashboard generates;
  // changes are rare.
  return (
    <Script
      id="ms-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", ${JSON.stringify(projectId)});
        `,
      }}
    />
  );
}
