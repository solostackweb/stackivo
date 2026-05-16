import Link from "next/link";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default function ClientNotFound() {
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-8">
        <Link href="/dashboard/clients">← All clients</Link>
      </Button>
      <EmptyState
        icon={UserX}
        title="Client not found"
        description="The client you're looking for doesn't exist or has been deleted."
        action={{ label: "Back to clients", href: "/dashboard/clients" }}
      />
    </div>
  );
}
