/**
 * /admin — the "Now" page.
 *
 * Single-screen morning standup. Scan it, close it. 95% of admin
 * sessions end here.
 *
 * Architecture: every query is small, indexed, and runs in parallel
 * via Promise.all. Target: < 1.2s p95 server render.
 *
 * Sections (top → bottom):
 *
 *   1. Revenue        — captured today / wk / active subs / past due
 *   2. Pipeline       — signups, unverified, trial ending soon
 *   3. Communications — email failures / suppressions / security
 *   4. What broke     — top 5 recent severity='alert' security events
 *   5. Recent actions — last 10 admin_actions rows
 */

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  getRevenueSnapshot,
  getPipelineSnapshot,
  getCommsSnapshot,
  getRecentAlerts,
  getRecentAdminActivity,
} from "@/features/admin/queries";
import { getSupportPulse } from "@/features/support/admin-queries";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Stat, type StatTone } from "@/components/admin/stat";
import {
  formatIstStamp,
  formatPaiseInr,
  formatRelative,
  shortenId,
} from "@/features/admin/format";

export const dynamic = "force-dynamic";

export default async function AdminNowPage() {
  const [revenue, pipeline, comms, alerts, recent, support] = await Promise.all([
    getRevenueSnapshot(),
    getPipelineSnapshot(),
    getCommsSnapshot(),
    getRecentAlerts(5),
    getRecentAdminActivity(10),
    getSupportPulse(),
  ]);

  const securityTone: StatTone =
    comms.securityAlertsLast24h > 0
      ? "alert"
      : comms.securityEventsLast24h > 0
        ? "warn"
        : "ok";

  const failureTone: StatTone =
    comms.emailFailuresLast24h >= 5
      ? "alert"
      : comms.emailFailuresLast24h > 0
        ? "warn"
        : "ok";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Now"
        subtitle={
          <span className="tabular-nums">
            {formatIstStamp(new Date().toISOString())} IST · all metrics last
            24h unless labeled
          </span>
        }
      />

      {/* Revenue */}
      <section className="space-y-2">
        <SectionTitle>Revenue</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Captured today"
            value={formatPaiseInr(revenue.capturedTodayPaise)}
            hint={`${formatPaiseInr(revenue.capturedWeekPaise)} this week`}
            tone="ok"
          />
          <Stat
            label="Active subs"
            value={revenue.activeSubscriptions.toLocaleString("en-IN")}
            tone="neutral"
          />
          <Stat
            label="Past due (7d)"
            value={revenue.pastDueLast7d.toLocaleString("en-IN")}
            tone={revenue.pastDueLast7d > 0 ? "warn" : "neutral"}
          />
          <Stat
            label="Captured / wk"
            value={formatPaiseInr(revenue.capturedWeekPaise)}
            tone="neutral"
          />
        </div>
      </section>

      {/* Pipeline */}
      <section className="space-y-2">
        <SectionTitle>Pipeline</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Signups today"
            value={pipeline.signupsLast24h.toLocaleString("en-IN")}
            hint={`${pipeline.signupsLast7d.toLocaleString("en-IN")} this week`}
            tone={pipeline.signupsLast24h > 0 ? "ok" : "neutral"}
          />
          <Stat
            label="Unverified >7d"
            value={pipeline.unverifiedOlderThan7d.toLocaleString("en-IN")}
            tone={pipeline.unverifiedOlderThan7d > 0 ? "warn" : "neutral"}
          />
          <Stat
            label="Trial ends ≤3d"
            value={pipeline.trialingEndingSoon.toLocaleString("en-IN")}
            tone={pipeline.trialingEndingSoon > 0 ? "warn" : "neutral"}
          />
          <Stat
            label="Signups / wk"
            value={pipeline.signupsLast7d.toLocaleString("en-IN")}
            tone="neutral"
          />
        </div>
      </section>

      {/* Communications + Security */}
      <section className="space-y-2">
        <SectionTitle>Comms &amp; Security</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Email failures"
            value={comms.emailFailuresLast24h.toLocaleString("en-IN")}
            tone={failureTone}
          />
          <Stat
            label="Suppressions added"
            value={comms.suppressionsAddedLast24h.toLocaleString("en-IN")}
            tone={comms.suppressionsAddedLast24h > 0 ? "warn" : "neutral"}
          />
          <Stat
            label="Security alerts"
            value={comms.securityAlertsLast24h.toLocaleString("en-IN")}
            tone={securityTone}
          />
          <Stat
            label="Security events"
            value={comms.securityEventsLast24h.toLocaleString("en-IN")}
            tone="neutral"
          />
        </div>
      </section>

      {/* Support pulse */}
      <section className="space-y-2">
        <SectionTitle
          right={
            <Link
              href="/admin/support"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              open inbox →
            </Link>
          }
        >
          Support pulse
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Open chats (24h)"
            value={support.open_chats_24h.toLocaleString("en-IN")}
            tone={
              support.open_chats_24h >= 10
                ? "alert"
                : support.open_chats_24h > 0
                  ? "warn"
                  : "ok"
            }
          />
          <Stat
            label="Open tickets"
            value={support.open_tickets.toLocaleString("en-IN")}
            tone={
              support.open_tickets >= 20
                ? "alert"
                : support.open_tickets >= 5
                  ? "warn"
                  : "ok"
            }
          />
          <Stat
            label="Total open"
            value={support.total_open.toLocaleString("en-IN")}
            tone="neutral"
          />
          <Stat
            label="Resolved (7d)"
            value={support.resolved_7d.toLocaleString("en-IN")}
            tone="ok"
          />
        </div>
      </section>

      {/* What broke */}
      <section className="space-y-2">
        <SectionTitle
          right={
            <Link
              href="/admin/audit"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              all activity →
            </Link>
          }
        >
          What broke
        </SectionTitle>

        {alerts.length === 0 ? (
          <EmptyHint>No severity-alert events in the last 24h.</EmptyHint>
        ) : (
          <ul className="overflow-hidden rounded-md border bg-card">
            {alerts.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-1 border-b border-border/40 p-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">{a.kind}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {a.request_id ? `req ${shortenId(a.request_id)} · ` : null}
                    {a.user_id ? `user ${shortenId(a.user_id)} · ` : null}
                    {formatRelative(a.created_at)}
                  </div>
                </div>
                {a.request_id ? (
                  <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                    {shortenId(a.request_id)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent admin activity */}
      <section className="space-y-2">
        <SectionTitle
          right={
            <Link
              href="/admin/audit"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              full audit →
            </Link>
          }
        >
          Your last 10 actions
        </SectionTitle>

        {recent.length === 0 ? (
          <EmptyHint>
            No console activity yet. Audit log starts populating as soon as you
            perform a write.
          </EmptyHint>
        ) : (
          <ul className="overflow-hidden rounded-md border bg-card">
            {recent.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-1 border-b border-border/40 p-2.5 text-[13px] last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      row.success
                        ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
                        : "h-1.5 w-1.5 rounded-full bg-red-500"
                    }
                    aria-hidden
                  />
                  <span className="font-medium">{row.kind}</span>
                  <span className="text-muted-foreground">
                    {row.target_type}
                    {row.target_id ? ` · ${shortenId(row.target_id)}` : ""}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                  {row.duration_ms}ms · {formatRelative(row.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="pt-2">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Manage users <ExternalLink className="h-3 w-3" />
        </Link>
      </section>
    </div>
  );
}

function SectionTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </h2>
      {right}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-dashed bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
      {children}
    </div>
  );
}
