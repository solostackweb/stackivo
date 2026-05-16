/**
 * Next.js 14+ instrumentation entry point.
 *
 * Runs exactly once per runtime on cold start — this is where Sentry
 * must be initialised per-runtime so stack traces include source maps.
 *
 * Also exports `onRequestError` so Next.js can route request-phase
 * errors to Sentry without us having to wrap every route handler.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
