"use client";

/**
 * Global error boundary.
 *
 * Catches errors thrown INSIDE the root `app/layout.tsx` itself.
 * Required by Next.js App Router — without this, a crash in
 * `<AppProviders>` or `<html>` renders a blank page.
 *
 * Must render its OWN `<html>` + `<body>` because the layout tree
 * failed to mount. Minimal visual language — this page only exists
 * for worst-case scenarios.
 *
 * Sentry integration: every error is forwarded via
 * `Sentry.captureException`. When `NEXT_PUBLIC_SENTRY_DSN` is unset
 * the call is a no-op so development remains chatty via console only.
 */

import * as React from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    Sentry.captureException(error);
    // Console fallback so a dev without Sentry sees the stack.
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 24,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#0a1020",
          color: "#f8fafc",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 12,
        }}
      >
        <h1 style={{ fontSize: 20, margin: 0 }}>Something went wrong.</h1>
        <p style={{ maxWidth: 420, color: "#cbd5e1", fontSize: 14 }}>
          An unexpected error broke the page shell. Our team has been
          notified. Please reload to try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8,
            padding: "10px 18px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
        {error.digest ? (
          <p style={{ fontSize: 11, color: "#64748b", marginTop: 12 }}>
            Reference: {error.digest}
          </p>
        ) : null}
      </body>
    </html>
  );
}
