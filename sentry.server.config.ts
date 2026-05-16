/**
 * Sentry Node.js runtime SDK.
 *
 * Loaded via `instrumentation.ts` in the `nodejs` runtime branch.
 * Covers:
 *   - Server Components / Server Actions
 *   - API route handlers on the Node runtime
 *   - Cron jobs
 *
 * All events pass through the shared redactor before shipping.
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
