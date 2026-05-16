/**
 * Root middleware.
 *
 * Responsibilities:
 *   1. Refresh the Supabase auth session cookies on every request so the
 *      server always sees a valid JWT (via `updateSession()`).
 *   2. Enforce the public / protected / auth-only route model declared in
 *      `src/features/auth/routes.ts` and SAD §1.6.
 *
 * This file intentionally contains zero business logic. Per-feature
 * entitlement checks (e.g. "user is on Pro plan") happen inside route
 * handlers via `src/features/subscription/server.ts::requireFeature()`.
 */

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  AUTH_DEFAULT_REDIRECT,
  AUTH_LOGIN_ROUTE,
  buildLoginRedirect,
  isAuthOnlyPath,
  isProtectedPath,
} from "@/features/auth/routes";

/**
 * Generate a short correlation ID. We avoid `node:crypto` because the
 * middleware runs on the Edge runtime where only `globalThis.crypto`
 * is available. 16 random bytes → 128 bits of entropy, hex-encoded.
 */
function newRequestId(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export async function middleware(request: NextRequest) {
  // Every request gets a correlation id. Honour an incoming value so
  // upstream load balancers / tests can force a known id.
  const requestId =
    request.headers.get("x-request-id") ?? newRequestId();
  // Make it visible to the downstream server-rendered page + route
  // handlers via `headers()`.
  request.headers.set("x-request-id", requestId);

  const { response, user } = await updateSession(request);
  // And on the outgoing response so the browser / ops tooling can
  // read it back.
  response.headers.set("x-request-id", requestId);

  const pathname = request.nextUrl.pathname;

  // 0. /admin/* requires an authenticated admin. Authenticated non-admins
  //    are rewritten to /404 to make the surface indistinguishable from
  //    a missing page. Unauthenticated users fall through to the standard
  //    `protected → /login` redirect below.
  const isAdminPath =
    pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminPath) {
    if (user) {
      const role = (user.app_metadata as { role?: unknown } | null)?.role;
      if (role !== "admin") {
        const notFoundUrl = request.nextUrl.clone();
        notFoundUrl.pathname = "/404";
        notFoundUrl.search = "";
        return NextResponse.rewrite(notFoundUrl);
      }
    }
    // else: unauthenticated → handled by the `isProtectedPath` branch below.

    // Stricter Content-Security-Policy for the admin surface. The
    // customer-facing app uses a permissive CSP because it embeds
    // Razorpay checkout, PostHog autocapture, etc. The admin app has
    // no third-party iframes outside the optional PostHog dashboards
    // (which themselves render in iframes with their own CSP).
    //
    // This header is APPENDED to the response so any global headers
    // set via next.config remain in place except for CSP, which we
    // overwrite. `'unsafe-inline'` on script-src is required by
    // Next.js's chunk bootstrap — Next handles its own nonce policy
    // in production builds, but without a nonce passthrough we keep
    // it permissive and rely on `script-src 'self'` to block external
    // origins.
    response.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://api.qrserver.com",
        "font-src 'self' data:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.posthog.com https://*.ingest.sentry.io",
        // Allow PostHog dashboard / feature-flag iframes (settings-
        // controlled URLs). Wildcard the PostHog cloud hosts; the
        // admin chose them deliberately.
        "frame-src 'self' https://app.posthog.com https://eu.posthog.com https://us.posthog.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join("; "),
    );
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "no-referrer");
  }

  // 1. Unauthenticated user hitting a protected route → /login?next=<path>
  if (!user && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = AUTH_LOGIN_ROUTE;
    loginUrl.search = "";
    const redirectPath = buildLoginRedirect(pathname, request.nextUrl.search);
    const params = new URLSearchParams(redirectPath.split("?")[1] ?? "");
    for (const [k, v] of params) loginUrl.searchParams.set(k, v);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated user hitting an auth-only page → straight to dashboard.
  if (user && isAuthOnlyPath(pathname)) {
    const dashUrl = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    dashUrl.pathname =
      next &&
      next.startsWith("/") &&
      !next.startsWith("//") &&
      !isAuthOnlyPath(next.split("?")[0] ?? "")
        ? next
        : AUTH_DEFAULT_REDIRECT;
    dashUrl.search = "";
    return NextResponse.redirect(dashUrl);
  }

  return response;
}

/**
 * Run on every app route EXCEPT static assets and the Next internals.
 * Everything in `/auth/callback` MUST pass through this middleware so the
 * session cookie gets written before the route handler runs.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     *   - /_next/static (build assets)
     *   - /_next/image  (image optimisation)
     *   - /favicon.ico, /robots.txt, /sitemap.xml
     *   - any path ending in a file extension (e.g. .png, .svg)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
