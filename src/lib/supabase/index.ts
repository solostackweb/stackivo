/**
 * Barrel re-exports for the supabase utilities.
 *
 * Import from `@/lib/supabase` to keep call sites concise:
 *
 *   import { getBrowserSupabase } from "@/lib/supabase";
 *   import { getServerSupabase } from "@/lib/supabase/server";
 *
 * The admin + middleware + server clients are NOT re-exported here because
 * they are `server-only` and the barrel would be pulled into client bundles.
 */

export { getBrowserSupabase } from "./client";
export type {
  Database,
  Json,
  UserProfileRow,
  ClientRow,
  ProjectRow,
  InvoiceRow,
  InvoiceItemRow,
  ContractRow,
  FileRow,
  NotificationRow,
  SubscriptionRow,
  UsageCounterRow,
  SubscriptionPlanRow,
  SubscriptionStatusRow,
  BusinessType,
  OnboardingStep,
} from "./types";
