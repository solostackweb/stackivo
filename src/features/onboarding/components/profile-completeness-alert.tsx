import * as React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BusinessProfile } from "../types";

/**
 * Lightweight banner that surfaces missing critical business-profile data
 * AFTER onboarding has been marked complete (e.g. user skipped optional
 * fields and we want them to revisit). Renders nothing when the profile
 * has everything we expect.
 */
export function ProfileCompletenessAlert({
  profile,
}: {
  profile: BusinessProfile;
}) {
  const issues: string[] = [];
  if (!profile.legalName) issues.push("legal name");
  if (!profile.stateCode) issues.push("state");
  if (profile.gstRegistered && !profile.gstin) issues.push("GSTIN");

  if (issues.length === 0) return null;

  return (
    <div className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning/5 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <div className="flex-1 space-y-1">
        <p className="font-medium text-foreground">
          Your business profile is missing {issues.join(", ")}.
        </p>
        <p className="text-muted-foreground">
          Add it in settings so your invoices and contracts stay compliant.
        </p>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link href="/dashboard/settings/company">Update</Link>
      </Button>
    </div>
  );
}
