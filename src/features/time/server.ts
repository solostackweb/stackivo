import "server-only";

/**
 * Time-tracking persistence + aggregation.
 *
 * `startTimer()` creates an open-ended row (`ended_at IS NULL`); `stopTimer`
 * closes it and computes the billable amount. Manual entries skip the timer
 * altogether. The DB has a partial index on `(user_id) WHERE ended_at IS NULL`
 * so "the running timer" lookup is essentially free.
 */

import { getServerSupabase } from "@/lib/supabase/server";
import type { TimeEntryRow } from "@/lib/supabase/types";

export interface TimeEntryRecord {
  id: string;
  description: string | null;
  projectId: string | null;
  clientId: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  billable: boolean;
  hourlyRate: number;
  amount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export function mapTimeEntryRow(row: TimeEntryRow): TimeEntryRecord {
  return {
    id: row.id,
    description: row.description,
    projectId: row.project_id,
    clientId: row.client_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSeconds: row.duration_seconds,
    billable: row.billable,
    hourlyRate: row.hourly_rate,
    amount: row.amount,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Compute the billable amount for a time entry.
 *   amount = (durationSeconds / 3600) * hourlyRate
 * Rounded to two decimals.
 */
export function computeAmount(durationSeconds: number, hourlyRate: number): number {
  const hours = durationSeconds / 3600;
  return Math.round(hours * hourlyRate * 100) / 100;
}

export interface ListTimeEntriesOptions {
  projectId?: string;
  clientId?: string;
  from?: string; // ISO timestamp
  to?: string;
  billable?: boolean;
  limit?: number;
}

export async function listTimeEntries(
  opts: ListTimeEntriesOptions = {},
): Promise<TimeEntryRecord[]> {
  const supabase = await getServerSupabase();
  let q = supabase
    .from("time_entries")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.projectId) q = q.eq("project_id", opts.projectId);
  if (opts.clientId) q = q.eq("client_id", opts.clientId);
  if (opts.from) q = q.gte("started_at", opts.from);
  if (opts.to) q = q.lte("started_at", opts.to);
  if (typeof opts.billable === "boolean") q = q.eq("billable", opts.billable);
  const { data, error } = await q;
  if (error || !data) return [];
  return (data as unknown as TimeEntryRow[]).map(mapTimeEntryRow);
}

/**
 * The currently-running timer for the authenticated user, if any.
 * (`ended_at IS NULL` — there should be at most one.)
 */
export async function getRunningTimer(): Promise<TimeEntryRecord | null> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("time_entries")
    .select("*")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return mapTimeEntryRow(data as unknown as TimeEntryRow);
}

/**
 * Aggregations for the dashboard + Pulse:
 *   - total billable seconds in a window
 *   - total billable amount
 *   - per-project breakdown (top 5 by hours)
 */
export async function getTimeAggregates(opts: {
  from?: string;
  to?: string;
} = {}): Promise<{
  billableSeconds: number;
  nonBillableSeconds: number;
  billableAmount: number;
  byProject: Array<{ projectId: string | null; seconds: number; amount: number }>;
}> {
  const supabase = await getServerSupabase();
  let q = supabase
    .from("time_entries")
    .select("project_id, duration_seconds, amount, billable")
    .not("ended_at", "is", null);
  if (opts.from) q = q.gte("started_at", opts.from);
  if (opts.to) q = q.lte("started_at", opts.to);
  const { data } = await q;
  type Row = Pick<TimeEntryRow, "project_id" | "duration_seconds" | "amount" | "billable">;
  const rows = (data as unknown as Row[]) ?? [];

  let billableSeconds = 0;
  let nonBillableSeconds = 0;
  let billableAmount = 0;
  const byProjectMap = new Map<
    string | null,
    { seconds: number; amount: number }
  >();

  for (const r of rows) {
    if (r.billable) {
      billableSeconds += r.duration_seconds;
      billableAmount += Number(r.amount) || 0;
    } else {
      nonBillableSeconds += r.duration_seconds;
    }
    const cur = byProjectMap.get(r.project_id) ?? { seconds: 0, amount: 0 };
    cur.seconds += r.duration_seconds;
    cur.amount += Number(r.amount) || 0;
    byProjectMap.set(r.project_id, cur);
  }

  const byProject = Array.from(byProjectMap.entries())
    .map(([projectId, v]) => ({ projectId, ...v }))
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 5);

  return {
    billableSeconds,
    nonBillableSeconds,
    billableAmount: Math.round(billableAmount * 100) / 100,
    byProject,
  };
}
