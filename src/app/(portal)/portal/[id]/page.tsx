import { notFound } from "next/navigation";
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
  // Storage cap isn't shown on the client side — we leave it as Infinity
  // so the progress bar is hidden. The freelancer's quota is private to
  // them.
  return (
    <div className="space-y-6">
      <div
        className="rounded-lg border bg-background p-5"
        style={{
          borderTop: `3px solid ${access.portal.brand_color ?? "#6366F1"}`,
        }}
      >
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          {access.portal.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your shared workspace. Find contracts to sign, invoices to pay,
          files, and the conversation space below.
        </p>
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
