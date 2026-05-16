import "server-only";

/**
 * Server-side auth helpers for Server Components and Route Handlers.
 *
 * Use these to read the current user from RSC code paths. Mutations should
 * go through the server actions in `./actions.ts`.
 */

import { cache } from "react";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { AUTH_LOGIN_ROUTE, buildLoginRedirect } from "./routes";
import type { User } from "@supabase/supabase-js";

/**
 * Returns the current user or null. Safe to call anywhere on the server.
 *
 * Wrapped in React's request-scoped `cache()` so repeated calls within
 * one request collapse to a single `auth.getUser()` round-trip to Supabase
 * Auth. This matters: server actions, server components, and feature
 * helpers all call this independently, and `auth.getUser()` is a network
 * round-trip that validates the JWT against the server.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Returns the current user or redirects to `/login?next=<currentPath>`.
 *
 * Pass the current pathname (from `headers()` or the caller's context) so
 * the user is returned to where they tried to go. When omitted, defaults
 * to the plain login route.
 */
export async function requireUser(currentPath?: string): Promise<User> {
  const user = await getCurrentUser();
  if (user) return user;
  redirect(currentPath ? buildLoginRedirect(currentPath) : AUTH_LOGIN_ROUTE);
}
