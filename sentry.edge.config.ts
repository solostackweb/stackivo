/**
 * Sentry Edge runtime SDK.
 *
 * Loaded via `instrumentation.ts` in the `edge` runtime branch.
 * Covers Middleware + any route / action pinned to `runtime = "edge"`.
 * Edge runtime has no `node:crypto` so the redactor hashing helpers
 * fall back to `globalThis.crypto` transparently.
 */

import * as Sentry from "@sentry/nextjs";
import { env } from "@/config/env";
import { redact } from "@/lib/logger/redact";

Sentry.init({
  dsn: env.sentryDsn || undefined,
  release: env.commitSha,
  environment: env.runtimeEnv,
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    return redact(event) as typeof event;
  },
  enabled: Boolean(env.sentryDsn) && env.runtimeEnv !== "development",
});
