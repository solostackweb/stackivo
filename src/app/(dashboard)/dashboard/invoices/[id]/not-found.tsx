import Link from "next/link";
import { FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default function InvoiceNotFound() {
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-8">
        <Link href="/dashboard/invoices">← All invoices</Link>
      </Button>
      <EmptyState
        icon={FileX}
        title="Invoice not found"
        description="The invoice you're looking for doesn't exist or has been deleted."
        action={{ label: "Back to invoices", href: "/dashboard/invoices" }}
      />
    </div>
  );
}
