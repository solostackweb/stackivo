import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Workflow, ArrowRight } from "lucide-react";
import { listPortalsForCurrentUser } from "@/features/portals/server";
import { portalClientHome } from "@/features/portals/routes";

export const metadata = { title: "Your portals" };
export const dynamic = "force-dynamic";

export default async function ClientPortalIndexPage() {
  const { ownedPortals, memberPortals } = await listPortalsForCurrentUser();
  const all = [...memberPortals, ...ownedPortals];
  // De-duplicate (a freelancer testing their own portal would otherwise
  // see it twice).
  const seen = new Set<string>();
  const portals = all.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  if (portals.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-background p-10 text-center">
        <Workflow className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h1 className="text-lg font-semibold">No portals yet</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          When a freelancer invites you to a portal, it&apos;ll show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Your portals</h1>
        <p className="text-sm text-muted-foreground">
          Workspaces you&apos;re part of. Pick one to view its files,
          contracts, and invoices.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {portals.map((p) => (
          <Link
            key={p.id}
            href={portalClientHome(p.id)}
            className="group"
          >
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between">
                  <div
                    className="h-7 w-7 rounded-md"
                    style={{ background: p.brand_color ?? "#6366F1" }}
                    aria-hidden
                  />
                  <Badge variant="outline" className="capitalize text-[10px]">
                    {p.status}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-sm font-semibold leading-snug">
                  {p.name}
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition group-hover:text-foreground">
                  Open <ArrowRight className="h-3 w-3" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
