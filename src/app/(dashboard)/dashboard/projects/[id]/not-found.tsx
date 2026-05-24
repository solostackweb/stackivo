import Link from "next/link";
import { FolderX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default function ProjectNotFound() {
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-8">
        <Link href="/dashboard/projects">← All projects</Link>
      </Button>
      <EmptyState
        icon={FolderX}
        title="Project not found"
        description="The project you're looking for doesn't exist or has been deleted."
        action={{ label: "Back to projects", href: "/dashboard/projects" }}
      />
    </div>
  );
}
