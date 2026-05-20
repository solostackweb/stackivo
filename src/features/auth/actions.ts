"use server";

/**
 * Server actions for authentication.
 *
 * Keep these thin — they validate input, call Supabase, and return a
 * discriminated `ActionResult`. Redirects happen with `next/navigation`'s
 * `redirect()` so the browser's auth cookies (set by Supabase on the response)
 * are persisted.
 */

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { env } from "@/config/env";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  authLimit,
  getClientIp,
  passwordResetLimit,
  signupLimit,
} from "@/lib/rate-limit";
import { recordSecurityEvent } from "@/lib/security-events/server";
import { hashedEmail } from "@/lib/logger/redact";
import { identifyServer, trackServerEvent } from "@/lib/analytics/server";
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./schemas";
import { AUTH_DEFAULT_REDIRECT, AUTH_LOGIN_ROUTE } from "./routes";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

// --- helpers ----------------------------------------------------------------

async function getOrigin(): Promise<string> {
  // Prefer the runtime origin so preview deploys work without config changes.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return env.appUrl;
}

function sanitiseNext(next: string | null | undefined): string {
  // Only allow local paths so `?next=https://evil.com` can't be abused.
  if (!next || typeof next !== "string") return AUTH_DEFAULT_REDIRECT;
  if (!next.startsWith("/") || next.startsWith("//")) return AUTH_DEFAULT_REDIRECT;
  return next;
}

async function safeHashedEmail(email: string): Promise<string | undefined> {
  try {
    return await hashedEmail(email);
  } catch {
    return undefined;
  }
}

function userSafeErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  return "We couldn't create your account. Please try again in a moment.";
}

function isExistingAccountError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    normalized.includes("user already")
  );
}

// --- signup -----------------------------------------------------------------

export async function signupAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { fullName, email, password } = parsed.data;
  try {
    // Per-IP rate-limit so a single network can't spam-create accounts.
    const ip = await getClientIp();
    const gate = await signupLimit(`signup:${ip}`);
    if (!gate.ok) {
      await recordSecurityEvent({
        kind: "auth_ratelimit_tripped",
        severity: "warn",
        metadata: { flow: "signup", ip },
      });
      return { ok: false, error: gate.message };
    }

    const supabase = await getServerSupabase();
    const origin = await getOrigin();

    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(
          AUTH_DEFAULT_REDIRECT,
        )}`,
      },
    });

    if (error) {
      const message = userSafeErrorMessage(error);
      await recordSecurityEvent({
        kind: "auth_signup_failed",
        severity: "info",
        metadata: {
          email_hash: await safeHashedEmail(email),
          reason: message,
        },
      });

      if (isExistingAccountError(message)) {
        return {
          ok: false,
          error:
            "An account with that email already exists. Try logging in instead, or reset your password.",
        };
      }

      return { ok: false, error: message };
    }

    // Supabase default behaviour for an already-registered email: returns a
    // placeholder user row with `identities: []` and NO error. Without this
    // check the UI would falsely confirm signup. We surface a generic
    // "already registered" message that nudges the user to the login page
    // without leaking which email exists.
    const identities = (signUpData.user?.identities ?? []) as unknown[];
    const looksLikeExistingAccount =
      !!signUpData.user && identities.length === 0;
    if (looksLikeExistingAccount) {
      await recordSecurityEvent({
        kind: "auth_signup_duplicate",
        severity: "info",
        metadata: { email_hash: await safeHashedEmail(email) },
      });
      return {
        ok: false,
        error:
          "An account with that email already exists. Try logging in instead, or reset your password.",
      };
    }

    // Identify the (unverified) user in PostHog so the funnel from
    // signup -> email verified -> onboarding completed is joinable.
    if (signUpData.user) {
      await identifyServer(signUpData.user.id, {
        email: signUpData.user.email,
        createdAt: signUpData.user.created_at,
      });
      await trackServerEvent(signUpData.user.id, "auth.user.signed_up");
    }

    return {
      ok: true,
      message:
        "Check your inbox to verify your email - clicking the link signs you in and drops you into onboarding.",
    };
  } catch (err) {
    const message = userSafeErrorMessage(err);
    await recordSecurityEvent({
      kind: "auth_signup_failed",
      severity: "info",
      metadata: {
        email_hash: await safeHashedEmail(email),
        reason: message,
      },
    });
    return {
      ok: false,
      error: isExistingAccountError(message)
        ? "An account with that email already exists. Try logging in instead, or reset your password."
        : "We couldn't create your account. Please try again in a moment.",
    };
  }
}

// --- login ------------------------------------------------------------------

export async function loginAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { email, password } = parsed.data;

  // Two-key rate-limit:
  //   - Per (IP+email) to defend a single account against credential stuffing.
  //   - Per IP to catch broad sweeps across many emails.
  const ip = await getClientIp();
  const perAccount = await authLimit(`login:${ip}:${email.toLowerCase()}`);
  if (!perAccount.ok) {
    await recordSecurityEvent({
      kind: "auth_ratelimit_tripped",
      severity: "warn",
      metadata: {
        flow: "login",
        scope: "account",
        email_hash: await hashedEmail(email),
      },
    });
    return { ok: false, error: perAccount.message };
  }
  const perIp = await authLimit(`login-ip:${ip}`);
  if (!perIp.ok) {
    await recordSecurityEvent({
      kind: "auth_ratelimit_tripped",
      severity: "warn",
      metadata: { flow: "login", scope: "ip" },
    });
    return { ok: false, error: perIp.message };
  }

  const supabase = await getServerSupabase();

  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    // Audit-log the failed attempt with a hashed email so repeated
    // targeting of a single account is visible without storing the
    // plaintext address.
    await recordSecurityEvent({
      kind: "auth_login_failed",
      severity: "info",
      metadata: { email_hash: await hashedEmail(email) },
    });
    // Don't leak whether the email exists — generic message.
    return { ok: false, error: "Invalid email or password." };
  }

  // Success: identify in analytics + fire the login event. Both are
  // fire-and-forget and never throw.
  if (signInData.user) {
    await identifyServer(signInData.user.id, { email: signInData.user.email });
    await trackServerEvent(signInData.user.id, "auth.user.logged_in");
  }

  // Route admins straight to /admin and skip the freelancer dashboard
  // entirely. An admin who explicitly came from a deep `next=` link still
  // honours that destination so internal links keep working.
  const rawNext = formData.get("next")?.toString() ?? null;
  const role = (signInData.user?.app_metadata as { role?: unknown } | null)
    ?.role;
  if (role === "admin" && !rawNext) {
    redirect("/admin");
  }

  const next = sanitiseNext(rawNext);
  redirect(next);
}

// --- logout -----------------------------------------------------------------

export async function logoutAction() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  redirect(AUTH_LOGIN_ROUTE);
}

// --- forgot password --------------------------------------------------------

export async function forgotPasswordAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please enter a valid email.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Per-IP+email rate-limit on reset-mail to prevent inbox flooding.
  const ip = await getClientIp();
  const gate = await passwordResetLimit(
    `pwreset:${ip}:${parsed.data.email.toLowerCase()}`,
  );
  // Note: we still return success below to avoid leaking account existence,
  // but the actual mail is suppressed when the limiter trips.
  const limited = !gate.ok;

  // Audit log covers both the legitimate request AND the ratelimit
  // trip. A spike in either is a signal worth investigating.
  await recordSecurityEvent({
    kind: limited
      ? "auth_ratelimit_tripped"
      : "auth_password_reset_requested",
    severity: limited ? "warn" : "info",
    metadata: {
      flow: "password_reset",
      email_hash: await hashedEmail(parsed.data.email),
    },
  });

  const supabase = await getServerSupabase();
  const origin = await getOrigin();

  if (limited) {
    return {
      ok: true,
      message:
        "If an account exists for that email, we've sent password reset instructions.",
    };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${origin}/reset-password` },
  );

  // Return success even if the email doesn't exist — do not leak account
  // presence via this endpoint.
  if (error && process.env.NODE_ENV === "development") {
    console.error("[auth] resetPasswordForEmail:", error.message);
  }

  return {
    ok: true,
    message:
      "If an account exists for that email, we've sent password reset instructions.",
  };
}

// --- reset password (from reset link) --------------------------------------

export async function resetPasswordAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    message: "Password updated. You can now log in with your new password.",
  };
}

// --- Google OAuth (placeholder) --------------------------------------------
// Returns the URL the browser should redirect to. The auth/callback route
// handler finalises the session on return.
export async function googleOAuthAction(formData: FormData): Promise<void> {
  const supabase = await getServerSupabase();
  const origin = await getOrigin();
  const next = sanitiseNext(formData.get("next")?.toString() ?? null);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data?.url) {
    // Fall through to login with an error marker — OAuth is optional for MVP.
    redirect(`${AUTH_LOGIN_ROUTE}?error=oauth_unavailable`);
  }
  redirect(data.url);
}
