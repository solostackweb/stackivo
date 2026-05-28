import "server-only";

/**
 * Razorpay Dashboard API — admin console read-only metrics.
 *
 * Auth: Basic auth with RAZORPAY_KEY_ID:RAZORPAY_KEY_SECRET
 * Docs: https://razorpay.com/docs/api/
 *
 * Used by /admin/razorpay to surface payment and subscription KPIs.
 */

import { log } from "@/lib/logger";

const BASE = "https://api.razorpay.com/v1";

interface RazorpayCfg {
  keyId: string;
  keySecret: string;
}

function getCfg(): RazorpayCfg | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export function isRazorpayConfigured(): boolean {
  return getCfg() !== null;
}

function authHeader(cfg: RazorpayCfg): string {
  const token = Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString("base64");
  return `Basic ${token}`;
}

async function rzFetch<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  const cfg = getCfg();
  if (!cfg) return null;

  const url = new URL(`${BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: authHeader(cfg),
        "Content-Type": "application/json",
      },
      next: { revalidate: 120 }, // 2 min cache
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      log.warn("razorpay.api.fetch_failed", { path, status: res.status, body: text.slice(0, 300) });
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    log.warn("razorpay.api.exception", {
      path,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RazorpayPayment {
  id: string;
  entity: "payment";
  amount: number;       // paise
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  order_id: string | null;
  invoice_id: string | null;
  description: string | null;
  email: string | null;
  contact: string | null;
  method: "card" | "netbanking" | "wallet" | "emi" | "upi" | string;
  captured: boolean;
  created_at: number;   // epoch seconds
}

export interface RazorpaySubscription {
  id: string;
  entity: "subscription";
  plan_id: string;
  status: "created" | "authenticated" | "active" | "pending" | "halted" | "cancelled" | "completed" | "expired";
  current_start: number | null;
  current_end: number | null;
  ended_at: number | null;
  quantity: number;
  total_count: number;
  paid_count: number;
  customer_notify: boolean;
  created_at: number;
}

export interface RazorpayOrder {
  id: string;
  entity: "order";
  amount: number;       // paise
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: "created" | "attempted" | "paid";
  attempts: number;
  created_at: number;
}

// ---------------------------------------------------------------------------
// Payments — last N days
// ---------------------------------------------------------------------------

interface PaymentListResponse {
  entity: "collection";
  count: number;
  items: RazorpayPayment[];
}

/** Fetch up to `count` most recent payments. */
export async function listRecentPayments(count = 25): Promise<RazorpayPayment[]> {
  const data = await rzFetch<PaymentListResponse>("/payments", {
    count: String(count),
  });
  return data?.items ?? [];
}

// ---------------------------------------------------------------------------
// Aggregate metrics (compute from payments list)
// ---------------------------------------------------------------------------

export interface RazorpayMetrics {
  /** Total captured payments this month (epoch from → to) */
  totalCaptured: number;       // paise
  totalCapturedCount: number;
  totalFailed: number;         // paise
  totalFailedCount: number;
  successRate: number | null;  // 0–100
  /** Unique payer emails (last N payments) */
  uniquePayers: number;
  /** Method breakdown */
  byMethod: Record<string, number>; // method → count
}

/**
 * Compute rolling 30-day metrics from a list of payments.
 * We pass in pre-fetched payments so we can reuse them for the list.
 */
export function computePaymentMetrics(payments: RazorpayPayment[]): RazorpayMetrics {
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
  const recent = payments.filter((p) => p.created_at >= thirtyDaysAgo);

  let totalCaptured = 0;
  let totalCapturedCount = 0;
  let totalFailed = 0;
  let totalFailedCount = 0;
  const emailSet = new Set<string>();
  const byMethod: Record<string, number> = {};

  for (const p of recent) {
    if (p.email) emailSet.add(p.email);
    byMethod[p.method] = (byMethod[p.method] ?? 0) + 1;

    if (p.status === "captured") {
      totalCaptured += p.amount;
      totalCapturedCount++;
    } else if (p.status === "failed") {
      totalFailed += p.amount;
      totalFailedCount++;
    }
  }

  const total = totalCapturedCount + totalFailedCount;
  const successRate = total > 0 ? +((totalCapturedCount / total) * 100).toFixed(1) : null;

  return {
    totalCaptured,
    totalCapturedCount,
    totalFailed,
    totalFailedCount,
    successRate,
    uniquePayers: emailSet.size,
    byMethod,
  };
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

interface SubscriptionListResponse {
  entity: "collection";
  count: number;
  items: RazorpaySubscription[];
}

/** Fetch up to `count` most recent subscriptions. */
export async function listRecentSubscriptions(count = 50): Promise<RazorpaySubscription[]> {
  const data = await rzFetch<SubscriptionListResponse>("/subscriptions", {
    count: String(count),
  });
  return data?.items ?? [];
}

export interface SubscriptionSummary {
  active: number;
  pending: number;
  halted: number;
  cancelled: number;
  total: number;
}

export function summarizeSubscriptions(subs: RazorpaySubscription[]): SubscriptionSummary {
  const counts = { active: 0, pending: 0, halted: 0, cancelled: 0, total: subs.length };
  for (const s of subs) {
    if (s.status === "active") counts.active++;
    else if (s.status === "pending") counts.pending++;
    else if (s.status === "halted") counts.halted++;
    else if (s.status === "cancelled") counts.cancelled++;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert paise to INR string e.g. 50000 → "₹500.00" */
export function formatPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(paise / 100));
}

/** Format epoch seconds to readable date */
export function formatEpoch(epoch: number): string {
  return new Date(epoch * 1000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
