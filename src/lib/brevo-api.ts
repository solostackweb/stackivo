import "server-only";

/**
 * Brevo (formerly Sendinblue) Statistics API — admin console read-only.
 *
 * Auth: api-key header (BREVO_API_KEY env var).
 * Docs: https://developers.brevo.com/reference
 *
 * Used by /admin/emails to surface aggregate sending metrics.
 */

import { log } from "@/lib/logger";

const BASE = "https://api.brevo.com/v3";

function getKey(): string | null {
  return process.env.BREVO_API_KEY?.trim() ?? null;
}

export function isBrevoConfigured(): boolean {
  return !!getKey();
}

function headers() {
  return {
    "api-key": getKey()!,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BrevoEmailStats {
  /** Total emails sent in the period */
  sent: number;
  /** Successfully delivered */
  delivered: number;
  /** Unique opens */
  uniqueOpens: number;
  /** Total opens (includes re-opens) */
  totalOpens: number;
  /** Unique clicks */
  uniqueClicks: number;
  /** Total clicks */
  totalClicks: number;
  /** Hard + soft bounces */
  bounces: number;
  /** Spam complaints */
  spamReports: number;
  /** Unsubscribes */
  unsubscriptions: number;
  /** Blocked (suppression list hit before send) */
  blocked: number;
  /** Delivery rate 0–100 */
  deliveryRate: number | null;
  /** Open rate 0–100 (based on delivered) */
  openRate: number | null;
  /** Click rate 0–100 (based on delivered) */
  clickRate: number | null;
  /** Bounce rate 0–100 (based on sent) */
  bounceRate: number | null;
}

interface BrevoAggregateResponse {
  requests?: number;
  delivered?: number;
  hardBounces?: number;
  softBounces?: number;
  clicks?: number;
  uniqueClicks?: number;
  opens?: number;
  uniqueOpens?: number;
  spamReports?: number;
  blocked?: number;
  unsubscriptions?: number;
  invalid?: number;
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Aggregate stats for a date range
// ---------------------------------------------------------------------------

/**
 * Fetch aggregate email statistics for the given date range.
 * Defaults to the last 30 days.
 */
export async function getBrevoEmailStats(opts: {
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string;   // "YYYY-MM-DD"
} = {}): Promise<BrevoEmailStats | null> {
  const key = getKey();
  if (!key) return null;

  const end = opts.endDate ?? toISO(new Date());
  const startD = new Date();
  startD.setDate(startD.getDate() - 29);
  const start = opts.startDate ?? toISO(startD);

  try {
    const url = `${BASE}/smtp/statistics/aggregatedReport?startDate=${start}&endDate=${end}`;
    const res = await fetch(url, {
      headers: headers(),
      next: { revalidate: 300 }, // 5 min cache
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      log.warn("brevo.api.stats_failed", { status: res.status, body: text.slice(0, 300) });
      return null;
    }

    const data = (await res.json()) as BrevoAggregateResponse;
    const sent = data.requests ?? 0;
    const delivered = data.delivered ?? 0;
    const bounces = (data.hardBounces ?? 0) + (data.softBounces ?? 0);
    const uniqueOpens = data.uniqueOpens ?? 0;
    const totalOpens = data.opens ?? 0;
    const uniqueClicks = data.uniqueClicks ?? 0;
    const totalClicks = data.clicks ?? 0;
    const blocked = data.blocked ?? 0;
    const spamReports = data.spamReports ?? 0;
    const unsubscriptions = data.unsubscriptions ?? 0;

    return {
      sent,
      delivered,
      uniqueOpens,
      totalOpens,
      uniqueClicks,
      totalClicks,
      bounces,
      spamReports,
      unsubscriptions,
      blocked,
      deliveryRate: sent > 0 ? +((delivered / sent) * 100).toFixed(1) : null,
      openRate: delivered > 0 ? +((uniqueOpens / delivered) * 100).toFixed(1) : null,
      clickRate: delivered > 0 ? +((uniqueClicks / delivered) * 100).toFixed(1) : null,
      bounceRate: sent > 0 ? +((bounces / sent) * 100).toFixed(1) : null,
    };
  } catch (err) {
    log.warn("brevo.api.stats_exception", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Per-day stats for sparklines
// ---------------------------------------------------------------------------

export interface BrevoStatsDay {
  date: string; // "YYYY-MM-DD"
  sent: number;
  delivered: number;
  opens: number;
  clicks: number;
  bounces: number;
}

interface BrevoDailyRow {
  date?: string;
  requests?: number;
  delivered?: number;
  opens?: number;
  clicks?: number;
  hardBounces?: number;
  softBounces?: number;
}

/**
 * Fetch per-day breakdown for the last N days (default 30).
 * Returns an array sorted oldest → newest.
 */
export async function getBrevoStatsByDay(days = 30): Promise<BrevoStatsDay[]> {
  const key = getKey();
  if (!key) return [];

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));

  try {
    const url = `${BASE}/smtp/statistics/reports?startDate=${toISO(start)}&endDate=${toISO(end)}&aggregateBy=day&limit=${days}`;
    const res = await fetch(url, {
      headers: headers(),
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];
    const data = (await res.json()) as { reports?: BrevoDailyRow[] };
    return (data.reports ?? [])
      .map((row) => ({
        date: row.date ?? "",
        sent: row.requests ?? 0,
        delivered: row.delivered ?? 0,
        opens: row.opens ?? 0,
        clicks: row.clicks ?? 0,
        bounces: (row.hardBounces ?? 0) + (row.softBounces ?? 0),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (err) {
    log.warn("brevo.api.daily_exception", {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Account info
// ---------------------------------------------------------------------------

export interface BrevoAccountInfo {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  plan: string;
  creditsLeft: number | null;
}

export async function getBrevoAccount(): Promise<BrevoAccountInfo | null> {
  const key = getKey();
  if (!key) return null;

  try {
    const res = await fetch(`${BASE}/account`, {
      headers: headers(),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      email?: string;
      firstName?: string;
      lastName?: string;
      companyName?: string;
      plan?: Array<{ type?: string; creditsType?: string; credits?: number }>;
    };
    const emailPlan = data.plan?.find((p) => p.creditsType === "sendLimit");
    return {
      email: data.email ?? "",
      firstName: data.firstName ?? "",
      lastName: data.lastName ?? "",
      companyName: data.companyName ?? "",
      plan: data.plan?.[0]?.type ?? "unknown",
      creditsLeft: emailPlan?.credits ?? null,
    };
  } catch {
    return null;
  }
}
