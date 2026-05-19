import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import {
  PortalAccessError,
  getPortalSnapshot,
} from "@/features/portals/server";
import { PortalView } from "@/features/portals/components/portal-view";
import { isR2Configured } from "@/lib/r2/client";

export const metadata = { title: "Portal" };
export const dynamic = "force-dynamic";

export default async function ClientPortalHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let snapshot;
  try {
    snapshot = await getPortalSnapshot(id);
  } catch (err) {
    if (err instanceof PortalAccessError) {
      notFound();
    }
    throw err;
  }

  const { access } = snapshot;
  const brandColor = access.portal.brand_color ?? "#6366F1";

  // "Needs your attention" summary for the client — surfaces the two
  // things they're most likely here to do (sign / pay) so they don't
  // have to scroll the section list to find them.
  const unsignedContracts = snapshot.contracts.filter(
    (c) => c.status !== "signed" && c.status !== "declined",
  );
  const unpaidInvoices = snapshot.invoices.filter(
    (i) => i.status !== "paid" && i.status !== "cancelled",
  );
  const unacknowledgedWelcomeDocs = snapshot.welcomeDocuments.filter(
    (d) => d.acknowledgement_required && d.status !== "acknowledged",
  );
  const hasAttention =
    unsignedContracts.length > 0 ||
    unpaidInvoices.length > 0 ||
    unacknowledgedWelcomeDocs.length > 0;

  // Storage cap isn't shown on the client side — we leave it as Infinity
  // so the progress bar is hidden. The freelancer's quota is private to
  // them.
  return (
    <div className="space-y-6">
      <div
        className="overflow-hidden rounded-lg border bg-background"
        style={{ borderTop: `3px solid ${brandColor}` }}
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white"
              style={{ background: brandColor }}
              aria-hidden
            >
              {initialsFromName(access.portal.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Client workspace
              </p>
              <h1 className="mt-0.5 truncate text-lg font-bold tracking-tight sm:text-xl">
                {access.portal.name}
              </h1>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Your single hub for contracts, invoices, files, and updates.
              </p>
            </div>
          </div>

          {hasAttention && (
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {unsignedContracts.length > 0 && (
                <AttentionPill
                  brandColor={brandColor}
                  label="Contracts to sign"
                  count={unsignedContracts.length}
                  href={`#portal-contracts`}
                />
              )}
              {unpaidInvoices.length > 0 && (
                <AttentionPill
                  brandColor={brandColor}
                  label="Invoices to pay"
                  count={unpaidInvoices.length}
                  href={`#portal-invoices`}
                />
              )}
              {unacknowledgedWelcomeDocs.length > 0 && (
                <AttentionPill
                  brandColor={brandColor}
                  label="Guides to acknowledge"
                  count={unacknowledgedWelcomeDocs.length}
                  href={`#portal-welcome`}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <PortalView
        portalId={id}
        portalName={access.portal.name}
        brandColor={access.portal.brand_color ?? "#6366F1"}
        portalStatus={access.portal.status}
        currentUserId={access.userId}
        role={access.role}
        clientId={snapshot.client?.id ?? access.portal.client_id}
        clientEmail={snapshot.client?.email ?? null}
        members={snapshot.members.map((m) => ({
          user_id: m.user_id,
          role: m.role,
          profile: m.profile,
        }))}
        pendingInvitations={[]}
        files={snapshot.files}
        messages={snapshot.messages}
        contracts={snapshot.contracts}
        availableContracts={[]}
        invoices={snapshot.invoices}
        availableInvoices={[]}
        welcomeDocuments={snapshot.welcomeDocuments}
        availableWelcomeDocuments={[]}
        activity={snapshot.activity}
        storageUsage={snapshot.storageUsage}
        storageCap={Number.POSITIVE_INFINITY}
        r2Enabled={isR2Configured()}
      />
    </div>
  );
}

/**
 * Small actionable pill rendered inside the portal hero. Each one
 * anchor-links into the right section below so the client can tap
 * straight to the next thing they need to do.
 */
function AttentionPill({
  label,
  count,
  href,
  brandColor,
}: {
  label: string;
  count: number;
  href: string;
  brandColor: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-md border bg-card px-3 py-2.5 transition-colors hover:border-primary/40"
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[12px] font-bold tabular-nums text-white"
        style={{ background: brandColor }}
        aria-hidden
      >
        {count}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-medium">
        {label}
      </span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
    </Link>
  );
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? "") : "";
  return (first + last).toUpperCase() || "·";
}
