/**
 * Support system — shared types.
 *
 * Mirrors the columns of `public.support_threads` (see migration 0022)
 * and the controlled vocabularies used by Zoho Desk + Crisp. Keep this
 * file dependency-free so it can be imported from both server and
 * client modules.
 */

export type SupportSystem = "crisp" | "zoho_desk" | "brevo_failure";

export type SupportStatus =
  | "new"
  | "open"
  | "waiting"
  | "resolved"
  | "closed";

export type SupportPriority = "low" | "normal" | "high" | "urgent";

/**
 * Six-category taxonomy. Resist adding more — solo founders drown in
 * taxonomy. Free-form refinement happens via tags instead.
 */
export type SupportCategory =
  | "billing"
  | "bug"
  | "how-to"
  | "feature-request"
  | "account"
  | "onboarding";

export interface SupportThread {
  id: string;
  user_id: string | null;
  external_system: SupportSystem;
  external_id: string;
  subject: string | null;
  status: SupportStatus;
  priority: SupportPriority;
  category: SupportCategory | null;
  tags: string[];
  /** Canonical deep-link to the source system (Crisp inbox / Zoho ticket). */
  external_url: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Submitted by the in-app `/help` bug-report form. Every field is
 * trimmed + length-capped server-side before being shipped onward.
 */
export interface BugReportInput {
  category: SupportCategory;
  summary: string;
  details: string;
  /** Optional URL the user was on when they hit the bug. */
  page?: string;
  /** Optional user-provided email if logged-out flows ever use this. */
  email?: string;
}

export interface BugReportResult {
  ok: boolean;
  ticket_id?: string;
  /** Set when we fell back to email because Zoho Desk wasn't configured. */
  via?: "zoho_desk" | "email_fallback";
  error?: string;
}
