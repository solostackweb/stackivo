/**
 * OAuth + email-confirmation callback.
 *
 * Supabase will redirect here after:
 *   1. A successful Google OAuth flow (with `?code=...`).
 *   2. The user clicking the email-verification link from signup
 *      (also `?code=...`).
 *
 * We exchange the one-time code for a session, which sets the auth cookies
 * via our server Supabase client, then redirect to `?next=` (sanitised).
 *
 * Error handling:
 *   - Missing code     → redirect to login with ?error=missing_code
 *   - Exchange failure → redirect to login with ?error=<encoded message>
 *   - Both pages (login + signup) now render the ?error= param.
 */

import { NextResponse, type NextRequest } from "next/server";
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

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitiseNext(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      `${origin}${AUTH_LOGIN_ROUTE}?error=missing_code`,
    );
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Surface the raw error code so login/signup can show something helpful.
    const errorCode = encodeURIComponent(error.message);
    return NextResponse.redirect(
      `${origin}${AUTH_LOGIN_ROUTE}?error=${errorCode}`,
    );
  }

  // Session established — send the user to their destination.
  return NextResponse.redirect(`${origin}${next}`);
}
