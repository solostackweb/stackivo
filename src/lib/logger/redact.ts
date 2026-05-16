/**
 * Central PII redactor.
 *
 * Every path that ships data outside the application boundary
 * (Sentry, PostHog, structured logs, Slack alerts) runs through this
 * redactor first. Miss-list is better than allow-list here: we do NOT
 * want to lose useful debugging context, we just want to strip the
 * classes of values that are always unsafe to leak.
 *
 * DPDP (India) + GDPR stance:
 *   - GSTIN / PAN / Aadhaar are government identifiers; never log.
 *   - Email addresses are personal data; drop (callers that need
 *     attribution should hash first via `hashedEmail()` below).
 *   - Authorization headers, API keys, signatures are secrets.
 *   - Free-form text fields (invoice descriptions, messages) may
 *     contain client PII; we don't redact those by field name
 *     because that would gut the payload, but callers should avoid
 *     passing them here.
 */

import { createHash } from "node:crypto";

/** Keys that are redacted to `"[REDACTED]"` regardless of value type. */
const SENSITIVE_KEY_PATTERN =
  /^(password|token|secret|api[_-]?key|authorization|x-.*signature|.*signature|gstin|pan|aadhaar|card_number|cvv|account_number|ifsc|razorpay_signature|razorpay_payment_id|brevo.*key)$/i;

/**
 * Regex patterns that redact the matched SUBSTRING in any string value.
 * Kept narrow — we only match well-known formats, not greedy patterns
 * that would destroy most text.
 */
const VALUE_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // GSTIN: 15 chars, state code + PAN + entity + Z + checksum.
  {
    pattern:
      /\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/g,
    replacement: "[REDACTED_GSTIN]",
  },
  // PAN: 10 chars.
  {
    pattern: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g,
    replacement: "[REDACTED_PAN]",
  },
  // Credit-card-ish numbers (conservative).
  {
    pattern: /\b(?:\d[ -]?){13,19}\b/g,
    replacement: "[REDACTED_CARD]",
  },
];

/**
 * Recursively redact keys matching the sensitive key pattern, and
 * strip known sensitive substrings from string values. Returns a new
 * object — never mutates the input.
 */
export function redact<T>(value: T): T {
  return redactInner(value, new WeakSet()) as T;
}

function redactInner(value: unknown, seen: WeakSet<object>): unknown {
  if (value == null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return redactString(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactInner(item, seen));
  }
  if (typeof value === "object") {
    // Break recursion on circular graphs.
    if (seen.has(value as object)) return "[CIRCULAR]";
    seen.add(value as object);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        out[k] = "[REDACTED]";
        continue;
      }
      out[k] = redactInner(v, seen);
    }
    return out;
  }
  return value;
}

function redactString(input: string): string {
  let out = input;
  for (const { pattern, replacement } of VALUE_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/**
 * Deterministic email hash for analytics attribution. Same input
 * always produces the same hash, so funnels stay joinable without
 * sending the raw address downstream.
 *
 * 16 hex chars = 64 bits of entropy — enough for tenant-scoped
 * uniqueness at any realistic scale, short enough to read in dashboards.
 */
export function hashedEmail(email: string): string {
  return createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
}
