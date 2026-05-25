import { BarChart3 } from "lucide-react";
import {
  PulseDashboardView,
  parseRange,
} from "@/features/pulse/components/pulse-dashboard-view";
import { canUseFeature } from "@/features/subscription/server";
import { PageHeader } from "@/components/shared/page-header";
import { UpgradeWall } from "@/components/shared/upgrade-wall";

export const metadata = { title: "Pulse" };
export const dynamic = "force-dynamic";

export default async function PulsePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const [sp, allowed] = await Promise.all([
    searchParams,
    canUseFeature("pulse.advanced_reports"),
  ]);

  if (!allowed) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Pulse"
          description="Your paid revenue, top clients, and business trends."
        />
        <UpgradeWall
          icon={BarChart3}
          feature="Pulse"
          title="Advanced analytics are a Pro feature"
          description="See your full revenue history, top-performing clients, monthly averages, and payment trends — so you can make smart decisions about your business."
          benefits={[
            "12-month paid revenue chart with month-over-month trends",
            "Top clients ranked by total revenue",
            "Average monthly revenue and invoice metrics",
            "GST summary and export-ready reports",
          ]}
          requiredPlan="Pro"
        />
      </div>
    );
  }

  return <PulseDashboardView range={parseRange(sp.range)} />;
}
