import "server-only";

/**
 * Razorpay Payouts: vendor (freelancer) contact + fund-account management.
 *
 * When a freelancer enables Stackivo Managed or Smart Collect UPI payments,
 * we register them in Razorpay as a Contact with a bank-account Fund Account.
 * The Stackivo ops team then uses the Payouts API to push money to their
 * account after each client payment is captured.
 *
 * Each freelancer gets exactly one contact + one fund account. If the bank
 * details change, we create a new fund account and retire the old one (we
 * never modify fund accounts — Razorpay doesn't allow it).
 *
 * All database reads/writes use the admin client because this module is
 * only ever called from server actions that have already verified auth.
 */

import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  createContact,
  createFundAccount,
  lookupIfsc,
  type RazorpayContact,
  type RazorpayFundAccount,
} from "./client";

export interface BankDetails {
  accountHolderName: string;
  bankAccountNumber: string;
  ifsc: string;
  pan: string;
}

export interface RouteVendorIds {
  contactId: string;
  fundAccountId: string;
  bankName: string;
}

/**
 * Ensure the freelancer has a Razorpay Contact + Fund Account.
 *
 * - If they already have IDs stored, returns them immediately (no API call).
 * - If changing bank details, creates a NEW fund account under the existing
 *   contact and updates the stored fund_account_id.
 * - First-time: creates both contact and fund account.
 *
 * Throws if the Razorpay API call fails — the calling action should surface
 * the error to the user.
 */
export async function getOrCreateRouteVendor(
  userId: string,
  bank: BankDetails,
  forceNewFundAccount = false,
): Promise<RouteVendorIds> {
  const admin = getAdminSupabase();

  // --- Pull existing IDs from DB ------------------------------------------
  const { data: profile } = await admin
    .from("user_profiles")
    .select(
      "razorpay_contact_id, razorpay_fund_account_id, payout_bank_account_number, payout_bank_ifsc",
    )
    .eq("id", userId)
    .maybeSingle();

  const existing = profile as {
    razorpay_contact_id: string | null;
    razorpay_fund_account_id: string | null;
    payout_bank_account_number: string | null;
    payout_bank_ifsc: string | null;
  } | null;

  // Detect bank-detail change: if stored account/IFSC differs from what the
  // user is submitting, we must create a new fund account.
  const bankChanged =
    forceNewFundAccount ||
    existing?.payout_bank_account_number?.replace(/\s+/g, "") !==
      bank.bankAccountNumber.replace(/\s+/g, "") ||
    existing?.payout_bank_ifsc?.toUpperCase() !== bank.ifsc.toUpperCase();

  // --- Lookup IFSC to get canonical bank name ------------------------------
  const ifscData = await lookupIfsc(bank.ifsc);
  const bankName = ifscData?.BANK ?? deriveBankNameFromIfsc(bank.ifsc);

  // --- Create or reuse Razorpay Contact ------------------------------------
  let contactId = existing?.razorpay_contact_id;
  let contact: RazorpayContact | null = null;

  if (!contactId) {
    contact = await createContact({
      name: bank.accountHolderName.trim(),
      referenceId: `stackivo_user_${userId}`,
      type: "vendor",
      notes: { platform: "stackivo", user_id: userId },
    });
    contactId = contact.id;
  }

  // --- Create or reuse Fund Account ----------------------------------------
  let fundAccountId = existing?.razorpay_fund_account_id;
  let fundAccount: RazorpayFundAccount | null = null;

  if (!fundAccountId || bankChanged) {
    fundAccount = await createFundAccount({
      contactId,
      accountHolderName: bank.accountHolderName.trim(),
      ifsc: bank.ifsc.trim().toUpperCase(),
      accountNumber: bank.bankAccountNumber.replace(/\s+/g, ""),
    });
    fundAccountId = fundAccount.id;
  }

  // --- Persist IDs + PAN in DB if anything changed -------------------------
  if (!existing?.razorpay_contact_id || bankChanged) {
    await admin
      .from("user_profiles")
      .update({
        razorpay_contact_id: contactId,
        razorpay_fund_account_id: fundAccountId,
        payout_pan: bank.pan.trim().toUpperCase(),
        payout_bank_name: bankName,
      } as never)
      .eq("id", userId);
  }

  return { contactId, fundAccountId, bankName };
}

/**
 * Minimal bank-name heuristic from the first 4 chars of an IFSC code.
 * Used as a fallback when the IFSC lookup API is unavailable.
 */
function deriveBankNameFromIfsc(ifsc: string): string {
  const prefix = ifsc.slice(0, 4).toUpperCase();
  const known: Record<string, string> = {
    HDFC: "HDFC Bank",
    ICIC: "ICICI Bank",
    SBIN: "State Bank of India",
    UTIB: "Axis Bank",
    KKBK: "Kotak Mahindra Bank",
    PUNB: "Punjab National Bank",
    BKID: "Bank of India",
    BARB: "Bank of Baroda",
    CNRB: "Canara Bank",
    UBIN: "Union Bank of India",
    IOBA: "Indian Overseas Bank",
    IDFB: "IDFC FIRST Bank",
    YESB: "Yes Bank",
    INDB: "IndusInd Bank",
    RATN: "RBL Bank",
  };
  return known[prefix] ?? "Bank";
}
