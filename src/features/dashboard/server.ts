import "server-only";

/**
 * Dashboard aggregation layer.
 *
 * `getDashboardSnapshot()` is the single function the dashboard page calls.
 * It runs all the per-domain aggregates in parallel and packages them into
 * ONE typed view-model so RSC can render the whole shell without
 * waterfalling. Everything the widgets display — names, initials, labels —
 * is pre-computed here so each widget is a pure render function.
 */

import { getServerSupabase } from "@/lib/supabase/server";
import { getInvoiceAggregates, type InvoiceRecord } from "@/features/invoices/server";
import { getProjectAggregates } from "@/features/projects/server";
import {
  getClientAggregates,
  mapClientRow,
  type ClientRecord,
} from "@/features/clients/server";
import { getContractAggregates } from "@/features/contracts/server";
import {
  getOverdueTotal,
  getRevenueSeries,
  getClientRevenue,
  type ClientRevenueRow,
} from "@/features/pulse/server";
import { listActivity, type ActivityRecord } from "@/features/activity/server";
import { getTimeAggregates } from "@/features/time/server";
import { getUnreadNotificationCount } from "@/features/notifications/server";
import type { ClientRow } from "@/lib/supabase/types";

export interface InvoiceFeedItem {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: InvoiceRecord["status"];
  issueDate: string;
  dueDate: string;
  paidAt: string | null;
  clientId: string | null;
  clientName: string;
  clientInitials: string;
  /** Negative = overdue by N days, positive = due in N days, 0 = due today. */
  dueInDays: number;
}

export interface ClientFeedItem {
  id: string;
  name: string;
  email: string | null;
  initials: string;
  lifetimeValue: number;
}

export interface TopClientRow extends ClientRevenueRow {
  name: string;
  initials: string;
}

function initialsFromName(name: string | null | undefined): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? "") : "";
  return (first + last).toUpperCase() || "·";
}

function displayName(client: ClientRecord | undefined): string {
  if (!client) return "Unknown client";
  return client.businessName ?? client.fullName ?? "Unknown client";
}

function daysBetween(fromIso: string, now = Date.now()): number {
  const t = new Date(fromIso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((t - now) / 86_400_000);
}

/**
 * Hydrate an arbitrary list of invoices with their client display info.
 * Clients are batch-fetched so there's no N+1.
 */
async function hydrateInvoiceFeed(
  invoices: InvoiceRecord[],
): Promise<InvoiceFeedItem[]> {
  if (invoices.length === 0) return [];
  const supabase = await getServerSupabase();
  const clientIds = Array.from(
    new Set(invoices.map((i) => i.clientId).filter((id): id is string => !!id)),
  );
  const clientMap = new Map<string, ClientRecord>();
  if (clientIds.length > 0) {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .in("id", clientIds);
    for (const row of (data as unknown as ClientRow[]) ?? []) {
      const mapped = mapClientRow(row);
      clientMap.set(mapped.id, mapped);
    }
  }

  return invoices.map((inv) => {
    const client = inv.clientId ? clientMap.get(inv.clientId) : undefined;
    const name = displayName(client);
    return {
      id: inv.id,
      number: inv.invoiceNumber,
      amount: inv.totalAmount,
      currency: inv.currency,
      status: inv.status,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      paidAt: inv.paidAt,
      clientId: inv.clientId,
      clientName: name,
      clientInitials: initialsFromName(name),
      dueInDays: daysBetween(inv.dueDate),
    };
  });
}

export async function getDashboardSnapshot() {
  const monthStart = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
  ).toISOString();

  const [
    invoices,
    projects,
    clients,
    contracts,
    overdue,
    revenueSeries,
    topClientsRaw,
    activity,
    time,
    unreadNotifications,
  ] = await Promise.all([
    getInvoiceAggregates(),
    getProjectAggregates(),
    getClientAggregates(),
    getContractAggregates(),
    getOverdueTotal(),
    getRevenueSeries(6),
    getClientRevenue(5),
    listActivity({ limit: 10 }),
    getTimeAggregates({ from: monthStart }),
    getUnreadNotificationCount(),
  ]);

  // Run the two display-hydration steps in parallel — they are independent,
  // each fetches a small set of client rows by `id`.
  const topClientIds = topClientsRaw
    .map((r) => r.clientId)
    .filter((id): id is string => !!id);

  const [recentInvoices, topClientMap] = await Promise.all([
    hydrateInvoiceFeed(invoices.recent),
    (async (): Promise<Map<string, ClientRecord>> => {
      const map = new Map<string, ClientRecord>();
      if (topClientIds.length === 0) return map;
      const supabase = await getServerSupabase();
      const { data } = await supabase
        .from("clients")
        .select("*")
        .in("id", topClientIds);
      for (const row of (data as unknown as ClientRow[]) ?? []) {
        const mapped = mapClientRow(row);
        map.set(mapped.id, mapped);
      }
      return map;
    })(),
  ]);

  const topClients: TopClientRow[] = topClientsRaw.map((r) => {
    const client = r.clientId ? topClientMap.get(r.clientId) : undefined;
    const name = displayName(client);
    return {
      ...r,
      name,
      initials: initialsFromName(name),
    };
  });

  const recentClients: ClientFeedItem[] = clients.recent.map((c) => {
    const name = c.businessName ?? c.fullName;
    return {
      id: c.id,
      name,
      email: c.email,
      initials: initialsFromName(name),
      lifetimeValue:
        topClients.find((t) => t.clientId === c.id)?.totalPaid ?? 0,
    };
  });

  return {
    invoices,
    projects,
    clients,
    contracts,
    pulse: { overdue, revenueSeries, topClients },
    activity,
    time,
    unreadNotifications,
    recentInvoices,
    recentClients,
  };
}

export type DashboardSnapshot = Awaited<ReturnType<typeof getDashboardSnapshot>>;
export type { ActivityRecord };

/**
 * Sidebar counters — small + cheap. Called from the dashboard layout's
 * navigation so the sidebar always reflects current state.
 */
export async function getSidebarCounters() {
  const [invoices, projects, contracts, unread] = await Promise.all([
    getInvoiceAggregates(),
    getProjectAggregates(),
    getContractAggregates(),
    getUnreadNotificationCount(),
  ]);
  return {
    invoicesDraft: invoices.draftCount,
    invoicesOverdue: invoices.overdueCount,
    projectsActive: projects.active,
    contractsAwaitingSignature: contracts.awaitingSignature,
    notificationsUnread: unread,
  };
}
