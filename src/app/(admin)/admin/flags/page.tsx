/**
 * /admin/flags — embedded PostHog feature-flags page.
 *
 * Same iframe pattern as /admin/analytics. The URL lives in
 * `platform_settings.posthog_feature_flags_url`.
 */

import Link from "next/link";
import { getPlatformSetting } from "@/features/admin/queries";
import { AdminPageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";

export default async function AdminFlagsPage() {
  const url = await getPlatformSetting<string>("posthog_feature_flags_url");
  const trimmed = (url ?? "").trim();

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col space-y-3">
      <AdminPageHeader
        title="Feature flags"
        subtitle="Embedded PostHog feature-flags view"
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
          <p className="mb-2">No PostHog feature-flags URL configured.</p>
          <p>
            Set <code>posthog_feature_flags_url</code> in{" "}
            <Link href="/admin/settings" className="underline">
              /admin/settings
            </Link>{" "}
            to PostHog&apos;s flag dashboard page (Note: most PostHog
            organisations require an authenticated browser session to view
            this, so the iframe may show a login screen until you sign in
            in another tab on the same browser).
          </p>
        </div>
      ) : (
        <iframe
          src={trimmed}
          className="w-full flex-1 rounded-md border bg-card"
          loading="lazy"
          title="PostHog feature flags"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      )}
    </div>
  );
}
