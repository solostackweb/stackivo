import type { NextConfig } from "next";

/**
 * Production response headers.
 *
 * Defense-in-depth against MIME-sniffing, clickjacking, sensor abuse,
 * downgrade attacks, and untrusted referrer leakage. HSTS is set so
 * browsers refuse to talk HTTP to this origin once they've seen the
 * header (Vercel terminates TLS, so this is safe in all environments).
 *
 * CSP is deliberately NOT set inline here — Next.js's default
 * behaviour around inline scripts (from RSC streaming + `next/script`)
 * requires per-request nonces to keep a strict CSP, which is a
 * dedicated migration. Track that as a follow-up.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  // Disable Chrome's deprecated XSS-Auditor (modern browsers ignore it
  // and the legacy heuristic itself was a known XS-Leak vector).
  { key: "X-XSS-Protection", value: "0" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        // Apply to every route, including API routes.
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

/**
 * Conditionally wrap with Sentry's Next.js plugin.
 *
 * `withSentryConfig` rewrites the module tree to upload source maps
 * during `next build` and patches server actions for automatic error
 * capture. We only apply it when SENTRY_AUTH_TOKEN is present so CI
 * and local builds without Sentry credentials keep working.
 *
 * The plugin is loaded lazily to keep the cold-start cost of
 * next.config itself trivial for everyone else.
 */
async function applySentry(config: NextConfig): Promise<NextConfig> {
  if (!process.env.SENTRY_AUTH_TOKEN) return config;
  try {
    const { withSentryConfig } = await import("@sentry/nextjs");
    return withSentryConfig(config, {
      // Silence build-time output when there's no DSN configured.
      silent: !process.env.NEXT_PUBLIC_SENTRY_DSN,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Upload source maps but DO NOT expose them publicly. v10's
      // sourcemaps options replace the older `hideSourceMaps` flag.
      widenClientFileUpload: true,
      sourcemaps: {
        deleteSourcemapsAfterUpload: true,
      },
      disableLogger: true,
    });
  } catch {
    return config;
  }
}

export default applySentry(nextConfig);
