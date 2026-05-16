import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { UpgradeCard } from "@/components/shared/upgrade-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Users } from "lucide-react";
import {
  canUseFeature,
  getCurrentSubscription,
} from "@/features/subscription/server";
import { listPortalsForCurrentUser } from "@/features/portals/server";
import { portalDashboardDetail } from "@/features/portals/routes";
import { CreatePortalButton } from "@/features/portals/components/create-portal-button";

export const metadata = { title: "Client Portals" };

export default async function PortalIndexPage() {
  const allowed = await canUseFeature("clients.portal");
  if (!allowed) {
    const sub = await getCurrentSubscription();
    return (
      <div className="space-y-6">
        <PageHeader
          title="Client portals"
          description="Branded shared workspaces for your clients."
        />
        <UpgradeCard
          icon={LayoutDashboard}
          title="Client Portal is a Pro feature"
          description={`Your ${sub?.plan ?? "free"} plan doesn't include portals. Upgrade to share files, contracts, and invoices in a branded space your clients will love.`}
          features={[
            "Branded portal per client",
            "Shared files (5 GB on Pro)",
            "In-portal contract signing & invoice payment",
            "Threaded comments + notifications",
          ]}
        />
      </div>
    );
  }

  const { ownedPortals } = await listPortalsForCurrentUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client portals"
        description="Branded shared workspaces for your clients."
        actions={<CreatePortalButton />}
      />
      {ownedPortals.length === 0 ? (
        <EmptyState
          icon={LayoutDashboard}
          title="No portals yet"
          description="Create a portal to share files, contracts, and invoices with a client in one branded space."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ownedPortals.map((p) => (
            <Link
              key={p.id}
              href={portalDashboardDetail(p.id)}
              className="group"
            >
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="h-7 w-7 shrink-0 rounded-md"
                      style={{ background: p.brand_color ?? "#6366F1" }}
                      aria-hidden
                    />
                    <Badge
                      variant="outline"
                      className="capitalize text-[10px]"
                    >
                      {p.status}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-sm font-semibold leading-snug">
                    {p.name}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Users className="h-3 w-3" /> Updated{" "}
                    {new Date(p.updated_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
