/**
 * Structured logger.
 *
 * JSON-per-line output on stdout so Vercel Log Drain → Better Stack
 * can parse without a regex. In dev, we emit readable output.
 *
 * Never use `console.*` directly in application code — route through
 * `log.*` so every line is indexable, redacted, and tagged.
 */

import { redact } from "./redact";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  /** Propagated from the `x-request-id` response header set by middleware. */
  requestId?: string;
  /** Authenticated user id when available. NEVER include email / PII. */
  userId?: string;
  /** Business entity being acted on. */
  entity?: { type: string; id?: string };
  /** Free-form context. Will be redacted before emission. */
  [key: string]: unknown;
}

interface LogEntry {
  t: string;
  lvl: LogLevel;
  msg: string;
  env?: string;
  commit?: string;
  [key: string]: unknown;
}

const IS_DEV =
  typeof process !== "undefined" && process.env.NODE_ENV !== "production";

function baseTags(): Partial<LogEntry> {
  return {
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
  };
}

function emit(level: LogLevel, message: string, ctx?: LogContext): void {
  const redacted = ctx ? (redact(ctx) as LogContext) : undefined;
  const entry: LogEntry = {
    t: new Date().toISOString(),
    lvl: level,
    msg: message,
    ...baseTags(),
    ...(redacted ?? {}),
  };
  const json = JSON.stringify(entry);
  if (level === "error" || level === "warn") {
    // Route to stderr so Vercel + Better Stack index severity correctly.
    console.error(IS_DEV ? prettyFormat(entry) : json);
  } else {
    console.log(IS_DEV ? prettyFormat(entry) : json);
  }
}

function prettyFormat(entry: LogEntry): string {
  const { t, lvl, msg, ...rest } = entry;
  const label = {
    debug: "\u001b[2mDEBUG\u001b[0m",
    info: "\u001b[34mINFO \u001b[0m",
    warn: "\u001b[33mWARN \u001b[0m",
    error: "\u001b[31mERROR\u001b[0m",
  }[lvl];
  const ctx = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";
  return `${t} ${label} ${msg}${ctx}`;
}

export const log = {
  debug: (message: string, ctx?: LogContext) => emit("debug", message, ctx),
  info: (message: string, ctx?: LogContext) => emit("info", message, ctx),
  warn: (message: string, ctx?: LogContext) => emit("warn", message, ctx),
  error: (message: string, ctx?: LogContext) => emit("error", message, ctx),
};

export type Logger = typeof log;
