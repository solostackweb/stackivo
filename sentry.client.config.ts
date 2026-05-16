/**
 * Sentry browser SDK configuration.
 *
 * Loaded by `instrumentation-client.ts` on every client-bundle boot.
 * Safe no-op when `NEXT_PUBLIC_SENTRY_DSN` is empty (`Sentry.init({ dsn: "" })`
 * is documented to disable all event shipping).
 *
 * PII policy (see `src/lib/logger/redact.ts` for the authoritative rules):
 *   - `beforeSend` runs every event through the project redactor, which
 *     strips GSTIN / PAN / tokens / secrets and scrubs matching
 *     substrings in string values.
 *   - `sendDefaultPii` stays `false` — Sentry must NOT auto-attach
 *     request bodies, query strings, or user email addresses.
 *   - `integrations` excludes any that capture input values.
 */

import * as Sentry from "@sentry/nextjs";

import { env } from "@/config/env";
import { redact } from "@/lib/logger/redact";

Sentry.init({
  dsn: env.sentryDsn || undefined,
  // Tie every event to the current commit so we can bisect regressions.
  release: env.commitSha,
  environment: env.runtimeEnv,
  // Strictly no default PII. We enrich explicitly when it's safe.
  sendDefaultPii: false,
  // Low sample rate — we care about errors, not performance volume.
  tracesSampleRate: 0.1,
  // Session replay: 0% by default. Flip on once you have GDPR/DPDP
  // banner + masking configured in the Sentry project.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  beforeSend(event) {
    // Redact every string field + nested property via the shared helper.
    // Cast dance: Sentry's types are strict Event; redact preserves shape.
    return redact(event) as typeof event;
  },
  // Don't double-log dev exceptions.
  enabled: Boolean(env.sentryDsn) && env.runtimeEnv !== "development",
});
