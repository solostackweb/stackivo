import Link from "next/link";
import { FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default function WelcomeDocNotFound() {
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-8">
        <Link href="/dashboard/welcome">← All welcome docs</Link>
      </Button>
      <EmptyState
        icon={FileX}
        title="Document not found"
        description="The welcome document you're looking for doesn't exist or has been deleted."
        action={{ label: "Back to welcome docs", href: "/dashboard/welcome" }}
      />
    </div>
  );
}
