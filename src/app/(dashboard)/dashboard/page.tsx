import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { AccountingOverview } from "@/components/dashboard/accounting-overview";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentClients } from "@/components/dashboard/recent-clients";
import { RecentInvoices } from "@/components/dashboard/recent-invoices";
import { RevenueChartLazy } from "@/components/dashboard/revenue-chart-lazy";
import { UpcomingReminders } from "@/components/dashboard/upcoming-reminders";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileCompletenessAlert } from "@/features/onboarding/components/profile-completeness-alert";
import { DashboardSetupChecklist } from "@/components/dashboard/setup-checklist";
import {
  getKpiSnapshot,
  getRecentFeedSnapshot,
  getRecentClientsSnapshot,
  getRemindersSnapshot,
} from "@/features/dashboard/server";
import { getBusinessProfile } from "@/features/onboarding/server";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";


function firstNameOf(
  profile: { fullName: string; displayName?: string | null } | null,
): string {
  const source = profile?.displayName ?? profile?.fullName;
  if (!source) return "back";
  return source.trim().split(/\s+/)[0] ?? "back";
}

// ─── Async streaming sections ────────────────────────────────────────────────

async function KpiSection() {
  const { collectedAllTime, outstanding, overdueAmount, activeProjects, revenueSeries } =
    await getKpiSnapshot();
  return (
    <>
      <AccountingOverview
        collectedAllTime={collectedAllTime}
        outstanding={outstanding}
        overdueAmount={overdueAmount}
        activeProjects={activeProjects}
      />
      <RevenueChartLazy series={revenueSeries} />
    </>
  );
}

async function FeedSection() {
  const { recentInvoices, activity } = await getRecentFeedSnapshot();
  return (
    <div className="grid items-start gap-4 md:grid-cols-[1fr_280px] lg:grid-cols-3">
      <div className="lg:col-span-2">
        <RecentInvoices items={recentInvoices} />
      </div>
      <ActivityTimeline items={activity} />
    </div>
  );
}

async function BottomGridSection() {
  const [{ recentClients }, { reminders }] = await Promise.all([
    getRecentClientsSnapshot(),
    getRemindersSnapshot(),
  ]);
  return (
    <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <RecentClients items={recentClients} />
      <QuickActions />
      <UpcomingReminders items={reminders} />
    </div>
  );
}

// ─── Skeleton fallbacks ───────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="space-y-5">
      {/* 4-tile KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5">
            <Skeleton className="mb-3 h-3.5 w-24" />
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>
      {/* Revenue chart placeholder */}
      <div className="rounded-xl border bg-card p-6">
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="h-[200px] w-full rounded-lg" />
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="grid items-start gap-4 md:grid-cols-[1fr_280px] lg:grid-cols-3">
      {/* Recent invoices */}
      <div className="rounded-xl border bg-card p-5 lg:col-span-2">
        <Skeleton className="mb-4 h-4 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
      {/* Activity timeline */}
      <div className="rounded-xl border bg-card p-5">
        <Skeleton className="mb-4 h-4 w-24" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="mt-0.5 h-6 w-6 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BottomGridSkeleton() {
  return (
    <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-5">
          <Skeleton className="mb-4 h-4 w-28" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Freelancer dashboard — streams in three independent sections.
 *
 * Render order (fastest to slowest):
 *   1. PageHeader + profile checklist/alert — resolved immediately from a
 *      single lightweight `getBusinessProfile()` query.
 *   2. KPI tiles + revenue chart — fast aggregates, no hydration step.
 *   3. Recent invoices + activity — requires a client-name hydration pass.
 *   4. Recent clients + quick actions + reminders — separate client query.
 *
 * Each section is wrapped in <Suspense> so React can flush it to the browser
 * as soon as its data arrives, without waiting for the sections below it.
 */
export default async function DashboardPage() {
  // Profile is needed synchronously for the page header greeting and the
  // setup checklist — it's a single cheap query so we don't defer it.
  const profile = await getBusinessProfile();
  const greetingName = firstNameOf(profile);

  return (
    <div className="space-y-5 sm:space-y-8">
      <PageHeader
        title={`Welcome back, ${greetingName}`}
        description="Here's what's happening with your business today."
        actions={
          <Button
            asChild
            size="sm"
            className="shadow-md shadow-primary/15 transition-shadow hover:shadow-lg hover:shadow-primary/20"
          >
            <Link href="/dashboard/invoices/new">
              <Plus /> New invoice
            </Link>
          </Button>
        }
      />

      {profile ? (
        <DashboardSetupChecklist
          hasSignature={Boolean(
            profile.signatureType ||
              profile.signatureImageUrl ||
              profile.signatureTextValue,
          )}
          hasClient={profile.lifetimeClientsCreated > 0}
        />
      ) : null}

      {profile ? <ProfileCompletenessAlert profile={profile} /> : null}

      {/* KPI tiles + revenue chart — fast DB aggregates */}
      <Suspense fallback={<KpiSkeleton />}>
        <KpiSection />
      </Suspense>

      {/* Recent invoices + activity — hydration waterfall */}
      <Suspense fallback={<FeedSkeleton />}>
        <FeedSection />
      </Suspense>

      {/* Recent clients + quick actions + reminders */}
      <Suspense fallback={<BottomGridSkeleton />}>
        <BottomGridSection />
      </Suspense>
    </div>
  );
}
