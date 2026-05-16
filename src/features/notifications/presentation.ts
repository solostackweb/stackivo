/**
 * Pure presentation helpers for notifications.
 *
 * The DB row stores a free-form `type` string (e.g. "invoice_paid",
 * "contract_signed"). UI code shouldn't hard-code those strings everywhere
 * — these helpers turn a notification into the icon, tone, and deep-link
 * the views need without any I/O.
 */

import {
  AlertTriangle,
  Bell,
  Eye,
  FileSignature,
  FileText,
  UserPlus,
  Wallet,
  Clock,
  type LucideIcon,
} from "lucide-react";
import type { NotificationRecord } from "./server";

export type NotificationTone = "default" | "success" | "info" | "warning";

export interface NotificationPresentation {
  icon: LucideIcon;
  tone: NotificationTone;
  href: string | null;
  /** ISO date (YYYY-MM-DD) extracted from `createdAt` for grouping. */
  dateKey: string;
}

/**
 * Map a notification's stored `type` to a deterministic UI presentation.
 * Unknown types fall back to a generic bell so older rows never crash the
 * UI after a deploy.
 */
export function presentNotification(
  n: Pick<NotificationRecord, "type" | "createdAt">,
): NotificationPresentation {
  const dateKey = n.createdAt.slice(0, 10);
  switch (n.type) {
    case "invoice_paid":
    case "payment_received":
      return { icon: Wallet, tone: "success", href: "/dashboard/invoices", dateKey };
    case "invoice_viewed":
      return { icon: Eye, tone: "info", href: "/dashboard/invoices", dateKey };
    case "invoice_sent":
      return {
        icon: FileText,
        tone: "default",
        href: "/dashboard/invoices",
        dateKey,
      };
    case "invoice_overdue":
      return {
        icon: AlertTriangle,
        tone: "warning",
        href: "/dashboard/invoices",
        dateKey,
      };
    case "invoice_reminder":
      return {
        icon: Clock,
        tone: "default",
        href: "/dashboard/invoices",
        dateKey,
      };
    case "client_created":
    case "client_updated":
      return {
        icon: UserPlus,
        tone: "info",
        href: "/dashboard/clients",
        dateKey,
      };
    case "contract_signed":
      return {
        icon: FileSignature,
        tone: "success",
        href: "/dashboard/contracts",
        dateKey,
      };
    case "contract_viewed":
    case "proposal_viewed":
      return {
        icon: Eye,
        tone: "info",
        href: "/dashboard/contracts",
        dateKey,
      };
    case "contract_sent":
      return {
        icon: FileSignature,
        tone: "default",
        href: "/dashboard/contracts",
        dateKey,
      };
    default:
      return { icon: Bell, tone: "default", href: null, dateKey };
  }
}

const TONE_STYLES: Record<NotificationTone, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-success/10 text-success",
  info: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
};

export function notificationToneClass(tone: NotificationTone): string {
  return TONE_STYLES[tone];
}
