/**
 * Server-side Supabase client.
 *
 * Use inside:
 *   - Server Components (RSC)
 *   - Route Handlers (`app/**\/route.ts`)
 *   - Server Actions (`"use server"`)
 *
 * This client reads/writes auth cookies so the user's session is available
 * on the server. All queries run as the authenticated user (subject to RLS).
 */

import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { env } from "@/config/env";
import type { Database } from "./types";

/**
 * Build a request-scoped Supabase client bound to the current cookie store.
 *
 * Usage:
 * ```ts
 * const supabase = await getServerSupabase();
 * const { data: { user } } = await supabase.auth.getUser();
 * ```
 */
export async function getServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // In Server Components `cookies()` is read-only. The setAll call will
        // throw there, which is fine — session refreshes happen in the
        // middleware (`updateSession()`), not in RSC.
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options as CookieOptions);
          }
        } catch {
          // RSC read-only cookie store — safe to ignore.
        }
      },
    },
  });
}
