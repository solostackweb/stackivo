import Link from "next/link";
import { Building2, FileCheck2, Plus, ShieldCheck, Timer, Users, Wallet } from "lucide-react";

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
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileCompletenessAlert } from "@/features/onboarding/components/profile-completeness-alert";
import { DashboardSetupChecklist } from "@/components/dashboard/setup-checklist";
import { getDashboardSnapshot } from "@/features/dashboard/server";
import { getBusinessProfile } from "@/features/onboarding/server";
import { getStateName } from "@/features/gst/state-codes";
import { formatINR } from "@/lib/format";

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

export default async function DashboardPage() {
  const [snapshot, profile] = await Promise.all([
    getDashboardSnapshot(),
    getBusinessProfile(),
  ]);

  const {
    invoices,
    clients,
    contracts,
    pulse,
    activity,
    time,
    recentInvoices,
    recentClients,
  } = snapshot;

  const hoursTracked = time.billableSeconds / 3600;
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
              <Plus /> New paid invoice
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

      {profile && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="group relative overflow-hidden transition-all hover:border-primary/20 hover:shadow-md">
              <CardContent className="flex items-start gap-4 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-indigo-500/10 text-primary ring-1 ring-primary/15">
                  <Building2 className="h-5 w-5" />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Business identity
                  </p>
                  <p className="truncate text-base font-bold">
                    {profile.businessName ?? profile.legalName ?? profile.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profile.stateCode
                      ? `${getStateName(profile.stateCode)} (${profile.stateCode})`
                      : "State not set"}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="group relative overflow-hidden transition-all hover:border-primary/20 hover:shadow-md">
              <CardContent className="flex items-start gap-4 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    GST status
                  </p>
                  <p className="truncate text-base font-bold">
                    {profile.gstRegistered ? "GST registered" : "Not registered"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {profile.gstRegistered
                      ? profile.gstin ?? "GSTIN missing"
                      : "Standard invoices"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          <ProfileCompletenessAlert profile={profile} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue this month"
          value={formatINR(invoices.paidThisMonth, { compact: true })}
          delta={{
            value: `${recentInvoices.length} recent invoice${recentInvoices.length === 1 ? "" : "s"}`,
            trend: "neutral",
          }}
          icon={Wallet}
        />
        <KpiCard
          label="Accrued contract income"
          value={formatINR(contracts.signedValue, { compact: true })}
          delta={{
            value: `${contracts.signed} signed contract${contracts.signed === 1 ? "" : "s"}`,
            trend: "neutral",
          }}
          icon={FileCheck2}
        />
        <KpiCard
          label="Active clients"
          value={String(clients.total)}
          delta={{
            value:
              clients.gstClients > 0
                ? `${clients.gstClients} GST registered`
                : "All clients",
            trend: "neutral",
          }}
          icon={Users}
        />
        <KpiCard
          label="Hours tracked (mo.)"
          value={`${hoursTracked.toFixed(1)}h`}
          delta={{
            value:
              time.billableAmount > 0
                ? `${formatINR(time.billableAmount, { compact: true })} billable`
                : "No entries yet",
            trend: "neutral",
          }}
          icon={Timer}
        />
      </div>

      <AccountingOverview
        totalInvoiced={invoices.totalInvoiced}
        collectedAllTime={invoices.collectedAllTime}
        outstanding={invoices.outstanding}
        overdueAmount={invoices.overdueAmount}
      />

      <RevenueChartLazy series={pulse.revenueSeries} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentInvoices items={recentInvoices} />
        </div>
        <ActivityTimeline items={activity} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RecentClients items={recentClients} />
        <QuickActions />
        <UpcomingReminders items={reminders} />
      </div>
    </div>
  );
}
