/**
 * OAuth + email-confirmation callback.
 *
 * Supabase will redirect here after:
 *   1. A successful Google OAuth flow (with `?code=...`).
 *   2. The user clicking the email-verification link from signup
 *      (also `?code=...`).
 *
 * We exchange the one-time code for a session, which sets the auth cookies
 * via our server Supabase client, then redirect to the short-lived
 * `stackivo_oauth_next` cookie or `?next=` fallback (sanitised).
 *
 * Error handling:
 *   - Missing code     → redirect to login with ?error=missing_code
 *   - Exchange failure → redirect to login with ?error=<encoded message>
 *   - Both pages (login + signup) now render the ?error= param.
 */

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  AUTH_DEFAULT_REDIRECT,
  AUTH_LOGIN_ROUTE,
} from "@/features/auth/routes";

function sanitiseNext(raw: string | null): string {
  if (!raw) return AUTH_DEFAULT_REDIRECT;
  if (!raw.startsWith("/") || raw.startsWith("//")) return AUTH_DEFAULT_REDIRECT;
  // Never redirect back to auth-only pages (would cause a loop).
  const authPaths = ["/login", "/signup", "/forgot-password", "/reset-password"];
  if (authPaths.some((p) => raw === p || raw.startsWith(`${p}?`))) {
    return AUTH_DEFAULT_REDIRECT;
  }
  return raw;
}

function sanitiseErrorRedirect(raw: string | null): typeof AUTH_LOGIN_ROUTE | "/signup" {
  return raw === "/signup" ? "/signup" : AUTH_LOGIN_ROUTE;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieStore = await cookies();
  const next = sanitiseNext(
    cookieStore.get("stackivo_oauth_next")?.value ?? searchParams.get("next"),
  );
  const errorRedirect = sanitiseErrorRedirect(
    cookieStore.get("stackivo_oauth_from")?.value ?? AUTH_LOGIN_ROUTE,
  );

  if (!code) {
    const response = NextResponse.redirect(
      `${origin}${errorRedirect}?error=missing_code`,
    );
    response.cookies.delete("stackivo_oauth_next");
    response.cookies.delete("stackivo_oauth_from");
    return response;
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Surface the raw error code so login/signup can show something helpful.
    const errorCode = encodeURIComponent(error.message);
    const response = NextResponse.redirect(
      `${origin}${errorRedirect}?error=${errorCode}`,
    );
    response.cookies.delete("stackivo_oauth_next");
    response.cookies.delete("stackivo_oauth_from");
    return response;
  }

  // Session established — send the user to their destination.
  const response = NextResponse.redirect(`${origin}${next}`);
  response.cookies.delete("stackivo_oauth_next");
  response.cookies.delete("stackivo_oauth_from");
  return response;
}
