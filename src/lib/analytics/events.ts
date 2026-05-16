/**
 * Product analytics event catalogue.
 *
 * Every tracked event name lives here. Keeping the schema in one file
 * makes the analytics language grep-able, prevents drift between
 * client and server call sites, and enables disciplined renames.
 *
 * Naming convention: `<domain>.<object>.<past_tense_verb>`
 * (see the observability audit, Section B).
 */

export type AnalyticsEvent =
  // --- Auth ----------------------------------------------------------------
  | "auth.user.signed_up"
  | "auth.user.logged_in"
  | "auth.user.logged_out"
  | "auth.password.reset_requested"
  // --- Onboarding ----------------------------------------------------------
  | "onboarding.step.completed"
  | "onboarding.flow.completed"
  // --- Clients -------------------------------------------------------------
  | "client.created"
  | "client.updated"
  | "client.deleted"
  // --- Invoices ------------------------------------------------------------
  | "invoice.created"
  | "invoice.sent"
  | "invoice.paid"
  | "invoice.reminder_sent"
  | "invoice.pdf_downloaded"
  | "invoice.share_link_viewed"
  // --- Contracts -----------------------------------------------------------
  | "contract.created"
  | "contract.sent"
  | "contract.viewed"
  | "contract.signed"
  | "contract.declined"
  // --- Billing -------------------------------------------------------------
  | "billing.checkout.opened"
  | "billing.subscription.activated"
  | "billing.subscription.cancelled"
  | "billing.payment.failed"
  // --- Files / Share -------------------------------------------------------
  | "file.uploaded"
  | "share.link.viewed"
  // --- Marketing funnel ----------------------------------------------------
  // Top-of-funnel + intent events fired from the public site so we can
  // measure landing → pricing → signup → onboarding → activation.
  | "marketing.cta.clicked"
  | "marketing.faq.opened"
  | "marketing.pricing.viewed"
  | "marketing.pricing.toggle_changed"
  | "marketing.contact.submitted"
  | "marketing.demo.opened"
  | "marketing.lead.captured"
  | "marketing.exit_intent.shown";

/**
 * Properties that any event may carry. Keep the superset tight —
 * bespoke per-event properties should be declared inline at call
 * sites, not here.
 */
export interface AnalyticsProps {
  /** Short enum categorising entities (invoice type, contract kind, etc). */
  category?: string;
  /** Pre-computed bucket so raw amounts don't leak into analytics. */
  amount_bucket?: "free" | "under_1k" | "1k_10k" | "10k_1L" | "over_1L";
  /** Subscription plan at event time. */
  plan?: "free" | "pro" | "business";
  /** Entity id for deep linking from analytics → app. */
  entity_id?: string;
  [key: string]: string | number | boolean | undefined;
}
