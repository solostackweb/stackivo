import Link from "next/link";
import { Plus } from "lucide-react";

import { AccountingOverview } from "@/components/dashboard/accounting-overview";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentClients } from "@/components/dashboard/recent-clients";
import { RecentInvoices } from "@/components/dashboard/recent-invoices";
import { RevenueChartLazy } from "@/components/dashboard/revenue-chart-lazy";
import {
  UpcomingReminders,
  type ReminderItem,
} from "@/components/dashboard/upcoming-reminders";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileCompletenessAlert } from "@/features/onboarding/components/profile-completeness-alert";
import { DashboardSetupChecklist } from "@/components/dashboard/setup-checklist";
import { getDashboardSnapshot } from "@/features/dashboard/server";
import { getBusinessProfile } from "@/features/onboarding/server";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function buildReminderFeed(): ReminderItem[] {
  return [];
}

function firstNameOf(
  profile: { fullName: string; displayName?: string | null } | null,
): string {
  const source = profile?.displayName ?? profile?.fullName;
  if (!source) return "back";
  return source.trim().split(/\s+/)[0] ?? "back";
}

/**
 * Freelancer dashboard.
 *
 * Layout decisions:
 *
 *   - One primary KPI strip (4 tiles in `<AccountingOverview/>`) — no
 *     secondary KPI rows. Identity + GST status used to live up here;
 *     they're now scoped to the Settings/Profile page where they're
 *     actually actionable.
 *
 *   - Single top-level CTA ("New invoice"). Quick actions live below in
 *     a dedicated card, not the header.
 *
 *   - Activity timeline is height-capped with its own scrollbar (see the
 *     component), so adding more activity rows never stretches the
 *     surrounding grid.
 */
export default async function DashboardPage() {
  const [snapshot, profile] = await Promise.all([
    getDashboardSnapshot(),
    getBusinessProfile(),
  ]);

  const {
    invoices,
    projects,
    activity,
    recentInvoices,
    recentClients,
    pulse,
  } = snapshot;

  const reminders = buildReminderFeed();
  const greetingName = firstNameOf(profile);

  return (
    <div className="space-y-8">
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

      <AccountingOverview
        collectedAllTime={invoices.collectedAllTime}
        outstanding={invoices.outstanding}
        overdueAmount={invoices.overdueAmount}
        activeProjects={projects.active}
      />

      <RevenueChartLazy series={pulse.revenueSeries} />

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentInvoices items={recentInvoices} />
        </div>
        <ActivityTimeline items={activity} />
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RecentClients items={recentClients} />
        <QuickActions />
        <UpcomingReminders items={reminders} />
      </div>
    </div>
  );
}
