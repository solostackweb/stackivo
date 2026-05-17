import "server-only";

/**
 * Two-option freelancer payment-method service.
 *
 * Stackivo deliberately stays out of "marketplace routing" territory at this
 * stage. Freelancers pick exactly one of:
 *
 *   - stackivo_managed: the platform Razorpay account collects, ops team
 *     pays out to the freelancer's bank manually within 1-2 business days.
 *   - upi_manual: clients pay directly into the freelancer's UPI VPA; the
 *     freelancer marks the invoice paid manually.
 *
 * This module is the single place that reads/writes the 0027
 * payment-method columns on `user_profiles`. Everything else (settings UI,
 * public payment page, webhook handler, receipts) goes through here so we
 * have one shape to enforce.
 *
 * Important: this module DOES NOT touch the legacy 0023 columns
 * (`razorpay_key_id`, `razorpay_key_secret_enc`, etc.). Those are
 * deprecated; they live on the row for historic data only.
 */

import { getAdminSupabase } from "@/lib/supabase/admin";
import type {
  PaymentMethodType,
  UserProfileRow,
} from "@/lib/supabase/types";

// --- Public-facing shapes ---------------------------------------------------

export interface ManagedPayoutDetails {
  accountHolderName: string;
  bankAccountNumber: string;
  ifsc: string;
  bankName: string;
}

export interface UpiPayoutDetails {
  vpa: string;
}

export type PaymentMethodConfig =
  | {
      type: "stackivo_managed";
      configuredAt: string | null;
      payout: ManagedPayoutDetails;
    }
  | {
      type: "upi_manual";
      configuredAt: string | null;
      payout: UpiPayoutDetails;
    };

/**
 * Lightweight summary used by UI surfaces that only need to know whether
 * a freelancer can take payments online — never includes secrets or full
 * bank-account numbers.
 */
export interface PaymentMethodSummary {
  type: PaymentMethodType | null;
  configuredAt: string | null;
  /** Last 4 digits of the bank account when type=stackivo_managed. */
  bankAccountLast4: string | null;
  /** Masked UPI VPA when type=upi_manual (e.g. `m••••@bank`). */
  upiVpaMasked: string | null;
  /** Display name for the bank, useful in UI ("HDFC"). */
  bankName: string | null;
}

// --- Read paths -------------------------------------------------------------

type PaymentMethodColumns = Pick<
  UserProfileRow,
  | "payment_method_type"
  | "payment_method_configured_at"
  | "payout_account_holder_name"
  | "payout_bank_account_number"
  | "payout_bank_ifsc"
  | "payout_bank_name"
  | "payout_upi_vpa"
>;

const PAYMENT_METHOD_COLUMNS =
  "payment_method_type, payment_method_configured_at, payout_account_holder_name, payout_bank_account_number, payout_bank_ifsc, payout_bank_name, payout_upi_vpa" as const;

/**
 * Read the full payment-method config (including raw bank/UPI details)
 * for a freelancer. Only safe to call from server contexts — never return
 * the result to a client component verbatim.
 */
export async function getUserPaymentMethod(
  userId: string,
): Promise<PaymentMethodConfig | null> {
  const admin = getAdminSupabase();
  const { data } = await admin
    .from("user_profiles")
    .select(PAYMENT_METHOD_COLUMNS)
    .eq("id", userId)
    .maybeSingle();
  const row = data as PaymentMethodColumns | null;
  if (!row?.payment_method_type) return null;

  if (row.payment_method_type === "stackivo_managed") {
    if (
      !row.payout_account_holder_name ||
      !row.payout_bank_account_number ||
      !row.payout_bank_ifsc ||
      !row.payout_bank_name
    ) {
      // Partial config — treat as "not configured yet" so the public page
      // falls back to its safe state instead of taking payments we can't
      // pay out.
      return null;
    }
    return {
      type: "stackivo_managed",
      configuredAt: row.payment_method_configured_at,
      payout: {
        accountHolderName: row.payout_account_holder_name,
        bankAccountNumber: row.payout_bank_account_number,
        ifsc: row.payout_bank_ifsc,
        bankName: row.payout_bank_name,
      },
    };
  }

  if (row.payment_method_type === "upi_manual") {
    if (!row.payout_upi_vpa) return null;
    return {
      type: "upi_manual",
      configuredAt: row.payment_method_configured_at,
      payout: { vpa: row.payout_upi_vpa },
    };
  }

  return null;
}

/**
 * Client-safe summary — masks sensitive bits. Use this in any component
 * that renders the current method as a status pill / read-out.
 */
export async function getUserPaymentMethodSummary(
  userId: string,
): Promise<PaymentMethodSummary> {
  const config = await getUserPaymentMethod(userId);
  if (!config) {
    return {
      type: null,
      configuredAt: null,
      bankAccountLast4: null,
      upiVpaMasked: null,
      bankName: null,
    };
  }
  if (config.type === "stackivo_managed") {
    const acct = config.payout.bankAccountNumber;
    return {
      type: "stackivo_managed",
      configuredAt: config.configuredAt,
      bankAccountLast4: acct.slice(-4),
      upiVpaMasked: null,
      bankName: config.payout.bankName,
    };
  }
  return {
    type: "upi_manual",
    configuredAt: config.configuredAt,
    bankAccountLast4: null,
    upiVpaMasked: maskUpiVpa(config.payout.vpa),
    bankName: null,
  };
}

function maskUpiVpa(vpa: string): string {
  const at = vpa.indexOf("@");
  if (at <= 0) return vpa;
  const local = vpa.slice(0, at);
  const handle = vpa.slice(at);
  if (local.length <= 2) return `${local}${handle}`;
  return `${local[0]}${"•".repeat(Math.max(local.length - 2, 2))}${local[local.length - 1]}${handle}`;
}

// --- Write paths ------------------------------------------------------------

const NOW = (): string => new Date().toISOString();

export async function saveStackivoManagedMethod(
  userId: string,
  payout: ManagedPayoutDetails,
): Promise<void> {
  const admin = getAdminSupabase();
  await admin
    .from("user_profiles")
    .update({
      payment_method_type: "stackivo_managed",
      payment_method_configured_at: NOW(),
      payout_account_holder_name: payout.accountHolderName.trim(),
      payout_bank_account_number: payout.bankAccountNumber.replace(/\s+/g, ""),
      payout_bank_ifsc: payout.ifsc.trim().toUpperCase(),
      payout_bank_name: payout.bankName.trim(),
      // Clear the UPI-side fields so we never store both — keeps the
      // active method unambiguous.
      payout_upi_vpa: null,
    } as never)
    .eq("id", userId);
}

export async function saveUpiManualMethod(
  userId: string,
  payout: UpiPayoutDetails,
): Promise<void> {
  const admin = getAdminSupabase();
  await admin
    .from("user_profiles")
    .update({
      payment_method_type: "upi_manual",
      payment_method_configured_at: NOW(),
      payout_upi_vpa: payout.vpa.trim(),
      // Clear managed-side fields so the UI never shows stale bank
      // details next to an active UPI method.
      payout_account_holder_name: null,
      payout_bank_account_number: null,
      payout_bank_ifsc: null,
      payout_bank_name: null,
    } as never)
    .eq("id", userId);
}

export async function clearPaymentMethod(userId: string): Promise<void> {
  const admin = getAdminSupabase();
  await admin
    .from("user_profiles")
    .update({
      payment_method_type: null,
      payment_method_configured_at: null,
      payout_account_holder_name: null,
      payout_bank_account_number: null,
      payout_bank_ifsc: null,
      payout_bank_name: null,
      payout_upi_vpa: null,
    } as never)
    .eq("id", userId);
}

// --- Validation helpers (server-side, also used by actions) ----------------

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCT_RE = /^[0-9]{6,18}$/;
// UPI VPA grammar per NPCI: local-part `[A-Za-z0-9._-]`, handle `[A-Za-z0-9]`.
const UPI_VPA_RE = /^[A-Za-z0-9.\-_]{2,}@[A-Za-z0-9]{2,}$/;

export function validateManagedPayout(
  input: ManagedPayoutDetails,
): { ok: true } | { ok: false; error: string } {
  if (!input.accountHolderName || input.accountHolderName.trim().length < 2) {
    return { ok: false, error: "Enter the account holder name." };
  }
  const acct = input.bankAccountNumber.replace(/\s+/g, "");
  if (!ACCT_RE.test(acct)) {
    return {
      ok: false,
      error: "Bank account number must be 6 to 18 digits.",
    };
  }
  if (!IFSC_RE.test(input.ifsc.trim().toUpperCase())) {
    return { ok: false, error: "IFSC code looks invalid (e.g. HDFC0001234)." };
  }
  if (!input.bankName || input.bankName.trim().length < 2) {
    return { ok: false, error: "Enter the bank name." };
  }
  return { ok: true };
}

export function validateUpiVpa(
  vpa: string,
): { ok: true } | { ok: false; error: string } {
  if (!UPI_VPA_RE.test(vpa.trim())) {
    return {
      ok: false,
      error: "Enter a valid UPI ID (e.g. yourname@okhdfcbank).",
    };
  }
  return { ok: true };
}
