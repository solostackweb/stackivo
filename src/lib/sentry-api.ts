import "server-only";
/**
 * Sentry REST API client — admin console read-only queries.
 *
 * Auth: Bearer token (SENTRY_AUTH_TOKEN env var).
 * Org:  SENTRY_ORG   e.g. "stackivo"
 * Proj: SENTRY_PROJECT e.g. "stackivo"
 *
 * Docs: https://docs.sentry.io/api/
 */

import { log } from "@/lib/logger";

const BASE = "https://sentry.io/api/0";

function cfg() {
  const token = process.env.SENTRY_AUTH_TOKEN?.trim();
  const org = process.env.SENTRY_ORG?.trim();
  const project = process.env.SENTRY_PROJECT?.trim();
  if (!token || !org || !project) return null;
  return { token, org, project };
}

export function isSentryConfigured(): boolean {
  return cfg() !== null;
}

async function sentryFetch<T>(path: string): Promise<T | null> {
  const c = cfg();
  if (!c) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${c.token}` },
      next: { revalidate: 60 }, // cache 60s — Sentry rate limits API
    });
    if (!res.ok) {
      log.warn("sentry.api.fetch_failed", { path, status: res.status });
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    log.warn("sentry.api.exception", {
      path,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SentryIssue {
  id: string;
  title: string;
  culprit: string;
  permalink: string;
  status: "resolved" | "unresolved" | "ignored";
  level: "fatal" | "error" | "warning" | "info" | "debug";
  count: string;        // event count as string
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  isUnhandled: boolean;
  project: { slug: string; name: string };
  metadata?: { value?: string; type?: string; filename?: string };
}

export interface SentryProjectStats {
  /** Array of [timestamp_seconds, count] tuples */
  stats: [number, number][];
  total: number;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Recent unresolved issues, newest first. Default limit 25.
 */
export async function getSentryIssues(opts: {
  limit?: number;
  query?: string;
  level?: "fatal" | "error" | "warning";
} = {}): Promise<SentryIssue[]> {
  const c = cfg();
  if (!c) return [];
  const params = new URLSearchParams({
    limit: String(Math.min(opts.limit ?? 25, 100)),
    sort: "date",
    query: opts.query ?? "is:unresolved",
  });
  if (opts.level) params.set("level", opts.level);
  const data = await sentryFetch<SentryIssue[]>(
    `/projects/${c.org}/${c.project}/issues/?${params}`,
  );
  return data ?? [];
}

/**
 * 24-hour event counts for the project (errors per hour).
 */
export async function getSentryStats24h(): Promise<{
  total: number;
  byHour: { hour: number; count: number }[];
}> {
  const c = cfg();
  if (!c) return { total: 0, byHour: [] };
  const since = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
  const data = await sentryFetch<{ stats?: [number, number][] }>(
    `/projects/${c.org}/${c.project}/stats/?stat=received&resolution=1h&since=${since}`,
  );
  const stats = data?.stats ?? [];
  const total = stats.reduce((s, [, n]) => s + n, 0);
  const byHour = stats.map(([ts, count]) => ({
    hour: new Date(ts * 1000).getUTCHours(),
    count,
  }));
  return { total, byHour };
}

/**
 * Single issue detail including latest event.
 */
export async function getSentryIssue(
  issueId: string,
): Promise<SentryIssue | null> {
  return sentryFetch<SentryIssue>(`/issues/${issueId}/`);
}
