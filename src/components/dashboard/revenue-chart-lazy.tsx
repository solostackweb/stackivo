"use client";

/**
 * Lazy client wrapper around `RevenueChart`.
 *
 * Recharts is ~95 KB gzipped — the single largest dependency in the
 * dashboard bundle. We split it out into its own chunk via
 * `next/dynamic({ ssr: false })`, with a skeleton fallback that matches
 * the final chart height so loading doesn't cause CLS.
 *
 * This must live in a `"use client"` module because `dynamic({ ssr: false })`
 * is only permitted in client components in Next.js 15+.
 */

import dynamic from "next/dynamic";
import type { RevenuePoint } from "@/features/pulse/server";

const RevenueChart = dynamic(
  () => import("./revenue-chart").then((m) => m.RevenueChart),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[332px] w-full animate-pulse rounded-lg border bg-card"
        aria-hidden
      />
    ),
  },
);

export function RevenueChartLazy({ series }: { series: RevenuePoint[] }) {
  return <RevenueChart series={series} />;
}
