/**
 * GST Decision Engine.
 *
 * Implements the matrix from "Stackivo GST Compliances v1.0" §6.
 *
 *   Seller GST?    Client GST?    Same state?     →  Tax mode    Classification
 *   ───────────    ───────────    ──────────         ────────    ──────────────
 *   No             any            any                non_gst     standard
 *   Yes            No             yes                cgst_sgst   b2c
 *   Yes            No             no                 igst        b2c
 *   Yes            Yes            yes                cgst_sgst   b2b
 *   Yes            Yes            no                 igst        b2b
 *
 * This module is PURE — it does not read user data. Pass in the resolved
 * seller/client GST status + state codes and get back a `TaxDecision`.
 */

export type TaxMode = "non_gst" | "cgst_sgst" | "igst";
export type InvoiceClassification = "standard" | "b2c" | "b2b";

export interface TaxDecisionInput {
  seller: {
    gstRegistered: boolean;
    stateCode: string | null;
  };
  client: {
    gstRegistered: boolean;
    stateCode: string | null;
  };
}

export interface TaxDecision {
  mode: TaxMode;
  classification: InvoiceClassification;
  /** True when CGST + SGST should be applied (intra-state). */
  intraState: boolean;
  /** Recommended footer copy for the generated invoice. */
  footerNote: string;
  /** Whether the freelancer's GSTIN should be printed on the invoice. */
  showSellerGstin: boolean;
  /** Whether the client's GSTIN should be printed on the invoice. */
  showClientGstin: boolean;
}

const STANDARD_FOOTER =
  "GST not applicable. Supplier not registered under GST.";
const GST_FOOTER =
  "GST charged as applicable under Indian GST regulations.";

export function decideTax(input: TaxDecisionInput): TaxDecision {
  const { seller, client } = input;

  // SCENARIO 1 — Freelancer not GST registered.
  if (!seller.gstRegistered) {
    return {
      mode: "non_gst",
      classification: "standard",
      intraState: false,
      footerNote: STANDARD_FOOTER,
      showSellerGstin: false,
      // The compliance doc says client GSTIN may be displayed for reference
      // but is optional. We default to OFF on standard invoices.
      showClientGstin: false,
    };
  }

  // Seller IS GST registered → mode depends on state comparison.
  const sameState =
    !!seller.stateCode &&
    !!client.stateCode &&
    seller.stateCode === client.stateCode;

  const classification: InvoiceClassification = client.gstRegistered ? "b2b" : "b2c";

  return {
    mode: sameState ? "cgst_sgst" : "igst",
    classification,
    intraState: sameState,
    footerNote: GST_FOOTER,
    showSellerGstin: true,
    showClientGstin: client.gstRegistered,
  };
}
