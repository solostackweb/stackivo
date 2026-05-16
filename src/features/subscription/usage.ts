import "server-only";

/**
 * Usage-counter mutations.
 *
 * Reads live in `./server.ts`. This file exposes the WRITE side: bumping
 * a metric for the authenticated user. Writes go through the SQL function
 * `public.increment_usage(user_id, metric, delta)` which handles the
 * upsert + month-bucketing atomically.
 *
 * Business modules should call these AFTER successfully persisting the
 * resource they are counting, or wrap both in a DB transaction.
 */

import { getServerSupabase } from "@/lib/supabase/server";
import type { UsageMetric } from "./types";

/**
 * Increment the caller's counter for `metric` by `delta` (default 1).
 * Returns the new monthly total, or `null` when the call is unauthenticated.
 */
export async function incrementUsage(
  metric: UsageMetric,
  delta = 1,
): Promise<number | null> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Cast around the generated RPC typings until `supabase gen types` is run.
  const { data, error } = await (
    supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>
  )("increment_usage", {
    p_user_id: user.id,
    p_metric: metric,
    p_delta: delta,
  });

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(`[usage] increment_usage(${metric}, ${delta})`, error);
    }
    return null;
  }
  return typeof data === "number" ? data : null;
}
