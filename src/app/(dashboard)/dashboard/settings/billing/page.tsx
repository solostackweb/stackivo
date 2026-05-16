import * as React from "react";
import {
  SettingsPageHeader,
  SettingsSection,
  SettingsField,
} from "@/features/settings/components/settings-section";
import {
  getBillingSubscription,
  listBillingPayments,
} from "@/features/billing/server";
import { PlanCard } from "@/features/billing/components/plan-card";
import { PlanPicker } from "@/features/billing/components/plan-picker";
import { PaymentHistory } from "@/features/billing/components/payment-history";
import { PaymentMethodCard } from "@/features/billing/components/payment-method-card";
import { SyncBillingButton } from "@/features/billing/components/sync-billing-button";
import { UsageGrid } from "@/features/billing/components/usage-grid";
import { getUsageSnapshot } from "@/features/subscription/server";
import type {
  UsageMetric,
  UsageSnapshot,
} from "@/features/subscription/types";
import { getProfile } from "@/features/profile/server";

export const dynamic = "force-dynamic";

const TRACKED_METRICS: UsageMetric[] = [
  "clients_created",
  "invoices_created",
  "projects_created",
  "storage_bytes",
];

export default async function BillingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string; limit?: string; plan?: string }>;
}) {
  const params = await searchParams;
  const [subscription, payments, profile, ...usageSnapshots] = await Promise.all([
    getBillingSubscription(),
    listBillingPayments(20),
    getProfile(),
    ...TRACKED_METRICS.map((m) => getUsageSnapshot(m)),
  ]);

  const usage = TRACKED_METRICS.reduce(
    (acc, metric, i) => {
      acc[metric] = usageSnapshots[i] ?? null;
      return acc;
    },
    {} as Record<UsageMetric, UsageSnapshot | null>,
  );

  return (
    <>
      <SettingsPageHeader
        title="Billing"
        description="Manage your Stackivo plan, usage, payment method, receipts, and subscription lifecycle."
      />

      <div className="flex justify-end">
        <SyncBillingButton />
      </div>

      <SettingsSection
        title="Billing identity"
        description="Business details used on receipts and payment confirmations."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <SettingsField label="Business name">
            <div className="text-sm">
              {profile?.businessName ?? profile?.legalName ?? profile?.fullName ?? "—"}
            </div>
          </SettingsField>
          <SettingsField label="Contact email">
            <div className="text-sm">{profile?.businessEmail ?? profile?.email ?? "—"}</div>
          </SettingsField>
          <SettingsField label="Contact phone">
            <div className="text-sm">{profile?.businessPhone ?? profile?.phone ?? "—"}</div>
          </SettingsField>
          <SettingsField label="GSTIN">
            <div className="text-sm font-mono">{profile?.gstin ?? "—"}</div>
          </SettingsField>
        </div>
      </SettingsSection>

      <PlanCard subscription={subscription} />

      <PaymentMethodCard subscription={subscription} payments={payments} />

      {(params.upgrade || params.limit) && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="font-medium text-primary">
            {params.limit
              ? `You've hit a ${humaniseMetric(params.limit)} limit on your current plan.`
              : `You need ${formatPlanName(params.plan)} to use ${humaniseFeature(params.upgrade!)}.`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upgrade below to unlock it instantly. Your existing data is preserved.
          </p>
        </div>
      )}

      <SettingsSection
        title="Usage"
        description="Live counts for the current billing period."
      >
        <UsageGrid snapshots={usage} />
      </SettingsSection>

      <SettingsSection
        title="Plan management"
        description="Upgrade, renew, downgrade, or move back to Free from inside Stackivo. Razorpay only processes the payment."
      >
        <PlanPicker
          currentPlan={subscription?.plan ?? "free"}
          currentCycle={subscription?.billingCycle ?? "monthly"}
        />
      </SettingsSection>

      <SettingsSection
        title="Invoices & receipts"
        description="Stackivo keeps a dashboard-native history of every subscription charge."
      >
        <PaymentHistory payments={payments} />
      </SettingsSection>
    </>
  );
}

function humaniseMetric(metric: string): string {
  switch (metric) {
    case "clients_created":
      return "client";
    case "invoices_created":
      return "monthly invoice";
    case "projects_created":
      return "monthly project";
    case "storage_bytes":
      return "storage";
    default:
      return metric.replace(/_/g, " ");
  }
}

function humaniseFeature(feature: string): string {
  return feature.replace(/^[a-z]+\./, "").replace(/_/g, " ");
}

function formatPlanName(plan?: string): string {
  if (!plan) return "a higher plan";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}
