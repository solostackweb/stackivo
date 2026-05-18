import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { requireFeature } from "@/features/subscription/server";
import { limitFor } from "@/features/subscription/features";
import {
  PortalAccessError,
  getPortalSnapshot,
} from "@/features/portals/server";
import { PortalView } from "@/features/portals/components/portal-view";
import { isR2Configured } from "@/lib/r2/client";
import { portalClientHome } from "@/features/portals/routes";

export const metadata = { title: "Portal" };

export default async function PortalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sub = await requireFeature("clients.portal");

  let snapshot;
  try {
    snapshot = await getPortalSnapshot(id);
  } catch (err) {
    if (err instanceof PortalAccessError && err.code === "not_found") {
      notFound();
    }
    throw err;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={snapshot.access.portal.name}
        description="Manage members, attach contracts, share files, and chat in one place."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={portalClientHome(id)} target="_blank">
              View as client <ExternalLink />
            </Link>
          </Button>
        }
      />
      <PortalView
        portalId={id}
        portalName={snapshot.access.portal.name}
        brandColor={snapshot.access.portal.brand_color ?? "#6366F1"}
        portalStatus={snapshot.access.portal.status}
        currentUserId={snapshot.access.userId}
        role="owner"
        clientId={snapshot.client?.id ?? snapshot.access.portal.client_id}
        clientEmail={snapshot.client?.email ?? null}
        members={snapshot.members.map((m) => ({
          user_id: m.user_id,
          role: m.role,
          profile: m.profile,
        }))}
        pendingInvitations={snapshot.pendingInvitations.map((i) => ({
          id: i.id,
          email: i.email,
          expires_at: i.expires_at,
        }))}
        files={snapshot.files}
        messages={snapshot.messages}
        contracts={snapshot.contracts}
        availableContracts={snapshot.availableContracts}
        invoices={snapshot.invoices}
        availableInvoices={snapshot.availableInvoices}
        welcomeDocuments={snapshot.welcomeDocuments}
        availableWelcomeDocuments={snapshot.availableWelcomeDocuments}
        activity={snapshot.activity}
        storageUsage={snapshot.storageUsage}
        storageCap={limitFor(sub, "storage_bytes")}
        r2Enabled={isR2Configured()}
      />
    </div>
  );
}
