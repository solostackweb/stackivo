/**
 * Supabase client wired for Next.js middleware.
 *
 * Middleware has a different cookie API than Server Components — it must
 * mutate the outgoing response's cookie jar to refresh the access token
 * on every request. This helper encapsulates that glue.
 *
 * Used by the root `middleware.ts`. Do not use elsewhere.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/config/env";
import type { Database } from "./types";

/**
 * Returns a fresh response with refreshed Supabase auth cookies + the
 * authenticated user (or null). Call this first thing in `middleware.ts`
 * before any route-protection logic.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient<Database>(
    env.supabaseUrl,
    env.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write the refreshed cookies back on both the incoming request
          // (so getUser() below sees them) and the outgoing response (so the
          // browser stores them).
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options as CookieOptions);
          }
        },
      },
    },
  );

  // IMPORTANT: Supabase recommends `getUser()` (not `getSession()`) in
  // middleware — it re-validates the JWT against the server so expired
  // tokens are rejected.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user, supabase };
}
