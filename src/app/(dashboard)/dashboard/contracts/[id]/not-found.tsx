import Link from "next/link";
import { FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default function ContractNotFound() {
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-8">
        <Link href="/dashboard/contracts">← All contracts</Link>
      </Button>
      <EmptyState
        icon={FileX}
        title="Contract not found"
        description="The contract you're looking for doesn't exist or has been deleted."
        action={{ label: "Back to contracts", href: "/dashboard/contracts" }}
      />
    </div>
  );
}
