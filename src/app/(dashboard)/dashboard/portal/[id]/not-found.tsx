import Link from "next/link";
import { Share2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default function PortalNotFound() {
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-8">
        <Link href="/dashboard/portal">← All portals</Link>
      </Button>
      <EmptyState
        icon={Share2Off}
        title="Portal not found"
        description="The portal you're looking for doesn't exist or has been deleted."
        action={{ label: "Back to portals", href: "/dashboard/portal" }}
      />
    </div>
  );
}
