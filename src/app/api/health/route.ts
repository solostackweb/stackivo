/**
 * Health check endpoint.
 *
 *   GET /api/health
 *
 * Returns 200 when the app can reach its database, 503 otherwise.
 * Public on purpose — synthetic monitors (UptimeRobot, BetterUptime)
 * hit this from unauthenticated regions. The payload deliberately
 * includes NO tenant data:
 *
 *   { ok, db_latency_ms, commit, env, time }
 *
 * Cache-busted via `no-store` + `force-dynamic` so probes always
 * exercise the live database round trip.
 */

import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { env } from "@/config/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const t0 = Date.now();
  let ok = true;
  let dbLatencyMs: number | null = null;

  try {
    const admin = getAdminSupabase();
    // Trivial 1-row read against a table every deployment has. Doesn't
    // read any customer data; exercises pooling + PG reachability.
    const { error } = await admin
      .from("user_profiles")
      .select("id")
      .limit(1);
    dbLatencyMs = Date.now() - t0;
    if (error) ok = false;
  } catch {
    ok = false;
  }

  return NextResponse.json(
    {
      ok,
      db_latency_ms: dbLatencyMs,
      commit: env.commitSha,
      env: env.runtimeEnv,
      time: new Date().toISOString(),
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "cache-control": "no-store, max-age=0",
      },
    },
  );
}
