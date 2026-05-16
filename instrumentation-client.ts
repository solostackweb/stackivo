/**
 * Next.js client-side instrumentation entry point.
 *
 * Runs once per browser session before the React tree mounts. We
 * import the Sentry client config for side effects (Sentry.init).
 *
 * Sentry's `captureRouterTransitionStart` integrates with the App
 * Router so navigation spans are captured as tracing events.
 */

import * as Sentry from "@sentry/nextjs";

import "./sentry.client.config";

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
