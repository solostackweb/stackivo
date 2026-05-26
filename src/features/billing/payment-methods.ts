import "server-only";

/**
 * Three-option freelancer payment-method service (updated in 0034).
 *
 * Freelancers choose exactly one active method:
 *
 *   stackivo_managed  — Razorpay Checkout (cards / UPI / net banking /
 *     international). Client pays via Stackivo's Razorpay account; Stackivo
 *     ops processes a Payout to the freelancer's bank within 1-2 business
 *     days. Requires bank account + PAN; freelancer registered as a Razorpay
 *     Contact + Fund Account.
 *
 *   upi_smart  — Smart Collect: per-invoice virtual UPI VPA. Client pays the
 *     virtual VPA; webhook auto-marks invoice paid. Same bank registration as
 *     stackivo_managed; Indian UPI only; ~1.77% Razorpay fee.
 *
 *   upi_manual  — Client pays directly to the freelancer's static UPI VPA.
 *     Zero fee. Freelancer confirms each payment manually.
 *
 * This module is the single source of truth for payment-method reads/writes.
 * All other surfaces (settings UI, public payment page, webhook) go through
 * these helpers so there is one shape to enforce.
 */

import { getAdminSupabase } from "@/lib/supabase/admin";
import type { PaymentMethodType, UserProfileRow } from "@/lib/supabase/types";

// --- Public-facing shapes ---------------------------------------------------

export interface BankPayoutDetails {
  accountHolderName: string;
  bankAccountNumber: string;
  ifsc: string;
  bankName: string;
  pan: string;
}

/** @deprecated Use BankPayoutDetails — kept so existing callers compile. */
export type ManagedPayoutDetails = BankPayoutDetails;

export interface UpiPayoutDetails {
  vpa: string;
}

export interface FeePassthroughConfig {
  enabled: boolean;
  /** Percentage stored as a plain number (e.g. 1.77 means 1.77%). Null means
   *  we haven't set a rate yet — the UI should show the default for the active
   *  method. */
  percent: number | null;
}

export type PaymentMethodConfig =
  | {
      type: "stackivo_managed";
      configuredAt: string | null;
      payout: BankPayoutDetails;
      razorpayContactId: string | null;
      razorpayFundAccountId: string | null;
      feePassthrough: FeePassthroughConfig;
    }
  | {
      type: "upi_smart";
      configuredAt: string | null;
      payout: BankPayoutDetails;
      razorpayContactId: string | null;
      razorpayFundAccountId: string | null;
      feePassthrough: FeePassthroughConfig;
    }
  | {
      type: "upi_manual";
      configuredAt: string | null;
      payout: UpiPayoutDetails;
      feePassthrough: FeePassthroughConfig;
    };

/**
 * Client-safe summary — masks sensitive fields. Use in any component that
 * renders the current method as a status pill or read-out.
 */
export interface PaymentMethodSummary {
  type: PaymentMethodType | null;
  configuredAt: string | null;
  /** Last 4 digits of the bank account (stackivo_managed / upi_smart). */
  bankAccountLast4: string | null;
  /** Masked UPI VPA for upi_manual (e.g. `m••••@bank`). */
  upiVpaMasked: string | null;
  bankName: string | null;
  /** Whether Razorpay vendor registration is complete. */
  routeRegistered: boolean;
  feePassthrough: FeePassthroughConfig;
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
  | "payout_pan"
  | "razorpay_contact_id"
  | "razorpay_fund_account_id"
  | "fee_passthrough_enabled"
  | "fee_passthrough_percent"
>;

const PAYMENT_METHOD_COLUMNS =
  "payment_method_type, payment_method_configured_at, payout_account_holder_name, payout_bank_account_number, payout_bank_ifsc, payout_bank_name, payout_upi_vpa, payout_pan, razorpay_contact_id, razorpay_fund_account_id, fee_passthrough_enabled, fee_passthrough_percent" as const;

/** Full config — only safe from server contexts. Never return to client verbatim. */
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

  const feePassthrough: FeePassthroughConfig = {
    enabled: row.fee_passthrough_enabled ?? false,
    percent: row.fee_passthrough_percent ?? null,
  };

  if (
    row.payment_method_type === "stackivo_managed" ||
    row.payment_method_type === "upi_smart"
  ) {
    if (
      !row.payout_account_holder_name ||
      !row.payout_bank_account_number ||
      !row.payout_bank_ifsc ||
      !row.payout_bank_name
    ) {
      return null; // Partial config — treat as not configured.
    }
    return {
      type: row.payment_method_type,
      configuredAt: row.payment_method_configured_at,
      payout: {
        accountHolderName: row.payout_account_holder_name,
        bankAccountNumber: row.payout_bank_account_number,
        ifsc: row.payout_bank_ifsc,
        bankName: row.payout_bank_name,
        pan: row.payout_pan ?? "",
      },
      razorpayContactId: row.razorpay_contact_id,
      razorpayFundAccountId: row.razorpay_fund_account_id,
      feePassthrough,
    };
  }

  if (row.payment_method_type === "upi_manual") {
    if (!row.payout_upi_vpa) return null;
    return {
      type: "upi_manual",
      configuredAt: row.payment_method_configured_at,
      payout: { vpa: row.payout_upi_vpa },
      feePassthrough,
    };
  }

  return null;
}

/** Masked summary safe for client components. */
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
      routeRegistered: false,
      feePassthrough: { enabled: false, percent: null },
    };
  }

  if (
    config.type === "stackivo_managed" ||
    config.type === "upi_smart"
  ) {
    const acct = config.payout.bankAccountNumber;
    return {
      type: config.type,
      configuredAt: config.configuredAt,
      bankAccountLast4: acct.slice(-4),
      upiVpaMasked: null,
      bankName: config.payout.bankName,
      routeRegistered:
        !!config.razorpayContactId && !!config.razorpayFundAccountId,
      feePassthrough: config.feePassthrough,
    };
  }

  return {
    type: "upi_manual",
    configuredAt: config.configuredAt,
    bankAccountLast4: null,
    upiVpaMasked: maskUpiVpa(config.payout.vpa),
    bankName: null,
    routeRegistered: false,
    feePassthrough: config.feePassthrough,
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

export async function saveBankPaymentMethod(
  userId: string,
  type: "stackivo_managed" | "upi_smart",
  payout: BankPayoutDetails,
  routeIds: { contactId: string; fundAccountId: string },
): Promise<void> {
  const admin = getAdminSupabase();
  await admin
    .from("user_profiles")
    .update({
      payment_method_type: type,
      payment_method_configured_at: NOW(),
      payout_account_holder_name: payout.accountHolderName.trim(),
      payout_bank_account_number: payout.bankAccountNumber.replace(/\s+/g, ""),
      payout_bank_ifsc: payout.ifsc.trim().toUpperCase(),
      payout_bank_name: payout.bankName.trim(),
      payout_pan: payout.pan.trim().toUpperCase(),
      razorpay_contact_id: routeIds.contactId,
      razorpay_fund_account_id: routeIds.fundAccountId,
      // Clear UPI-side fields so active method is unambiguous.
      payout_upi_vpa: null,
    } as never)
    .eq("id", userId);
}

/** @deprecated Use saveBankPaymentMethod — kept for backward compat. */
export async function saveStackivoManagedMethod(
  userId: string,
  payout: BankPayoutDetails,
): Promise<void> {
  // Legacy callers don't have route IDs yet. Save the bank fields only so
  // existing code paths don't break; the route IDs will be filled by the
  // new actions.
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
      // Clear bank-side fields.
      payout_account_holder_name: null,
      payout_bank_account_number: null,
      payout_bank_ifsc: null,
      payout_bank_name: null,
      payout_pan: null,
      razorpay_contact_id: null,
      razorpay_fund_account_id: null,
    } as never)
    .eq("id", userId);
}

export async function saveFeePassthrough(
  userId: string,
  config: FeePassthroughConfig,
): Promise<void> {
  const admin = getAdminSupabase();
  await admin
    .from("user_profiles")
    .update({
      fee_passthrough_enabled: config.enabled,
      fee_passthrough_percent: config.percent,
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
      // We intentionally preserve razorpay_contact_id / fund_account_id so
      // the ops team can still reference them, and payout_pan for KYC.
    } as never)
    .eq("id", userId);
}

// --- Validation helpers (server-side, also used by actions) ----------------

export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const ACCT_RE = /^[0-9]{6,18}$/;
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
// UPI VPA grammar per NPCI.
export const UPI_VPA_RE = /^[A-Za-z0-9.\-_]{2,}@[A-Za-z0-9]{2,}$/;

export function validateBankPayout(
  input: BankPayoutDetails,
): { ok: true } | { ok: false; error: string } {
  if (!input.accountHolderName || input.accountHolderName.trim().length < 2) {
    return { ok: false, error: "Enter the account holder name." };
  }
  const acct = input.bankAccountNumber.replace(/\s+/g, "");
  if (!ACCT_RE.test(acct)) {
    return { ok: false, error: "Bank account number must be 6–18 digits." };
  }
  const ifsc = input.ifsc.trim().toUpperCase();
  if (!IFSC_RE.test(ifsc)) {
    return {
      ok: false,
      error: "IFSC code is invalid. Format: HDFC0001234 (4 letters, 0, 6 alphanumeric).",
    };
  }
  const pan = input.pan.trim().toUpperCase();
  if (!PAN_RE.test(pan)) {
    return {
      ok: false,
      error: "PAN is invalid. Format: ABCDE1234F (5 letters, 4 digits, 1 letter).",
    };
  }
  return { ok: true };
}

/** @deprecated Use validateBankPayout */
export function validateManagedPayout(
  input: Pick<BankPayoutDetails, "accountHolderName" | "bankAccountNumber" | "ifsc" | "bankName">,
): { ok: true } | { ok: false; error: string } {
  return validateBankPayout({ ...input, pan: "AAAAA0000A" }); // bypass PAN check for legacy callers
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
