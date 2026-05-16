/**
 * /admin/analytics — embedded PostHog dashboard.
 *
 * Per the audit: don't rebuild what PostHog already does. We just
 * iframe the public dashboard URL the admin saved in
 * `platform_settings.posthog_dashboard_url`. If it's not set, render
 * a setup nudge.
 */

import Link from "next/link";
import { getPlatformSetting } from "@/features/admin/queries";
import { AdminPageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const url = await getPlatformSetting<string>("posthog_dashboard_url");
  const trimmed = (url ?? "").trim();

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col space-y-3">
      <AdminPageHeader
        title="Analytics"
        subtitle="Embedded PostHog dashboard"
        actions={
          <Link
            href="/admin/settings"
            className="rounded border px-3 py-1.5 text-xs hover:bg-accent"
          >
            Configure URL
          </Link>
        }
      />

      {!trimmed ? (
        <div className="rounded-md border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground">
          <p className="mb-2">
            No PostHog dashboard URL configured.
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Open PostHog → Dashboards → pick a dashboard.</li>
            <li>
              Click <strong>Share</strong> → enable a public-share link.
            </li>
            <li>
              Paste the URL into{" "}
              <Link href="/admin/settings" className="underline">
                /admin/settings
              </Link>{" "}
              under <code>posthog_dashboard_url</code>.
            </li>
            <li>Reload this page.</li>
          </ol>
        </div>
      ) : (
        <iframe
          src={trimmed}
          className="w-full flex-1 rounded-md border bg-card"
          loading="lazy"
          title="PostHog dashboard"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      )}
    </div>
  );
}
