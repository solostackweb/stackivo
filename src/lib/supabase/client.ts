/**
 * Browser-side Supabase client.
 *
 * Use inside Client Components and client-only hooks. Reads/writes go through
 * the anon key and are subject to RLS policies declared in
 * `supabase/migrations/0003_rls_policies.sql`.
 *
 * Do NOT use from Server Components — use `getServerSupabase()` instead.
 */

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/config/env";
import type { Database } from "./types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Returns a memoised browser Supabase client. We memoise because the SSR
 * package sets up storage + auth listeners on construction, and creating
 * multiple clients in the same tab leaks event listeners.
 */
export function getBrowserSupabase() {
  if (browserClient) return browserClient;
  browserClient = createBrowserClient<Database>(
    env.supabaseUrl,
    env.supabaseAnonKey,
  );
  return browserClient;
}
