import {
  PulseDashboardView,
  parseRange,
} from "@/features/pulse/components/pulse-dashboard-view";

export const metadata = { title: "Pulse" };
export const dynamic = "force-dynamic";

export default async function PulsePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  return <PulseDashboardView range={parseRange(sp.range)} />;
}
