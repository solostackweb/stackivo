import "server-only";

/**
 * Invoice PDF.
 *
 * Premium, financial-grade layout built on the shared `primitives` +
 * brand resolver. Page composition:
 *
 *   1. Top accent rule (brand colour)
 *   2. Branded header — logo, business name, contact / GSTIN
 *      Right column carries an eyebrow ("TAX INVOICE"), the invoice
 *      number, and a status badge (paid / overdue / sent / etc.).
 *   3. Amount hero — black surface, big total, "Due {date}" or
 *      "Paid {date}" sub-line.
 *   4. Meta grid — issue date, due date, doc type.
 *   5. Party pair — Billed to / From.
 *   6. Line items table — branded header row, zebra rows, right-aligned
 *      numerics.
 *   7. Totals block — subtotal / GST split / GRAND TOTAL (brand colour).
 *   8. Payment confirmation card — when paid: method, reference, paid date.
 *   9. Notes / Terms — left-rule callouts.
 *  10. Signature block — when present.
 *  11. Fixed branded footer with page numbers.
 *
 * All styling decisions live in `theme.ts` + `primitives.tsx`. This file
 * is a layout description, not a CSS dump.
 */

import * as React from "react";
import { Document, Text, View, StyleSheet } from "@react-pdf/renderer";
import { pdfColors, pdfFonts, pdfSizes, pdfSpacing, pdfRadii, pdfTracking, pdfPage } from "./theme";
import { resolveBrand, type ResolvedBrand } from "./brand";
import {
  AmountHero,
  Badge,
  DocumentFooter,
  DocumentHeader,
  DocumentPage,
  LineItemsTable,
  MetaGrid,
  NoteBlock,
  PartyPair,
  Section,
  SignatureBlock,
  TableCellText,
  TotalsBlock,
  formatCurrency,
  formatDate,
  type BadgeTone,
  type SignatureData,
  type TableColumn,
} from "./primitives";
import type { UserProfileRow } from "@/lib/supabase/types";

// --- Data shape (unchanged contract with builders.ts) -----------------------

export interface InvoicePdfItem {
  description: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  amount: number;
}

export interface InvoicePdfSeller {
  businessName: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  pan: string | null;
  addressLines: string[];
  stateCode: string | null;
  logoDataUrl: string | null;
  website: string | null;
  signature: (SignatureData & { legalName: string | null }) | null;
}

export interface InvoicePdfClient {
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  gstin: string | null;
  stateCode: string | null;
  addressLines: string[];
}

export interface InvoicePdfData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  status: string;
  paymentStatus: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  paymentAmount: number | null;
  paymentRecordedAt: string | null;
  brandColor: string | null;
  taxMode: "non_gst" | "cgst_sgst" | "igst";
  classification: "standard" | "b2c" | "b2b";
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxTotal: number;
  totalAmount: number;
  notes: string | null;
  terms: string | null;
  footerNote: string | null;
  paymentLink: string | null;
  publicUrl: string | null;
  items: InvoicePdfItem[];
  seller: InvoicePdfSeller;
  client: InvoicePdfClient;
}

// --- Template ---------------------------------------------------------------

const paymentCardStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: pdfSpacing.sectionGap,
  },
  card: {
    width: "55%",
    borderWidth: 0.5,
    borderColor: pdfColors.border,
    borderRadius: pdfRadii.md,
    padding: pdfSpacing.md,
    backgroundColor: pdfColors.surfaceMuted,
  },
  cardEmpty: { backgroundColor: pdfColors.surface },
  label: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.eyebrow,
    color: pdfColors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: pdfTracking.wider,
    marginBottom: 6,
  },
  big: {
    fontFamily: pdfFonts.bold,
    fontSize: pdfSizes.md,
    color: pdfColors.foreground,
    marginBottom: 6,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  rowLabel: { fontSize: pdfSizes.xs, color: pdfColors.mutedForeground },
  rowValue: {
    fontSize: pdfSizes.sm,
    fontFamily: pdfFonts.semibold,
    color: pdfColors.foreground,
  },
});

export function InvoicePdf({
  data,
  seller,
  logoDataUrl,
}: {
  data: InvoicePdfData;
  /** Optional fully-typed seller row — preferred. Falls back to data.seller. */
  seller?: UserProfileRow | null;
  logoDataUrl?: string | null;
}) {
  // Build the brand snapshot. Prefer a real seller row if provided; otherwise
  // shim the few fields the brand resolver needs from `data.seller` so this
  // template still works when called from older code paths.
  const brand = buildBrandFromData(data, seller, logoDataUrl);

  const docLabel = data.taxMode === "non_gst" ? "Invoice" : "Tax Invoice";
  const totals = resolveTotals(data);
  const isPaid = data.status === "paid";
  const isOverdue = data.status === "overdue";

  const statusTone: BadgeTone = isPaid
    ? "success"
    : isOverdue
      ? "danger"
      : data.status === "draft"
        ? "neutral"
        : "brand";
  const statusLabel =
    data.status === "partially_paid"
      ? "Partially paid"
      : data.status.replace(/_/g, " ");

  const heroEyebrow = isPaid
    ? "Amount paid"
    : isOverdue
      ? "Amount overdue"
      : "Amount due";
  const heroSub = isPaid
    ? `Paid on ${formatDate(data.paidAt ?? data.paymentRecordedAt)}`
    : `Due ${formatDate(data.dueDate)}`;

  return (
    <Document
      title={`${docLabel} ${data.invoiceNumber}`}
      author={brand.businessName}
      subject={`${docLabel} for ${data.client.name}`}
    >
      <DocumentPage brand={brand}>
        {/* Accent rule — brand colour, full page width, fixed to top. */}
        <View
          fixed
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: pdfPage.width,
            height: 4,
            backgroundColor: brand.accent,
          }}
        />
        <DocumentHeader
          brand={brand}
          eyebrow={docLabel.toUpperCase()}
          title={data.invoiceNumber}
          subtitle={
            data.classification === "b2b"
              ? "B2B"
              : data.classification === "b2c"
                ? "B2C"
                : undefined
          }
          decoration={
            <Badge
              tone={statusTone}
              brandAccent={brand.accent}
              label={statusLabel}
            />
          }
        />

        <AmountHero
          eyebrow={heroEyebrow}
          amount={formatCurrency(totals.paidAmount, data.currency)}
          sub={heroSub}
        />

        <MetaGrid
          items={[
            { label: "Issue date", value: formatDate(data.issueDate) },
            {
              label: isPaid ? "Payment date" : "Due date",
              value: formatDate(
                isPaid
                  ? data.paidAt ?? data.paymentRecordedAt ?? data.dueDate
                  : data.dueDate,
              ),
            },
            {
              label: "Document",
              value: docLabel,
            },
          ]}
        />

        <PartyPair
          left={{
            label: "Billed to",
            name: data.client.name,
            lines: [
              ...(data.client.companyName ? [data.client.companyName] : []),
              ...data.client.addressLines.slice(0, 4),
              ...(data.client.email ? [data.client.email] : []),
              ...(data.client.phone ? [data.client.phone] : []),
              ...(data.client.gstin ? [`GSTIN: ${data.client.gstin}`] : []),
              ...(data.client.stateCode
                ? [`State code: ${data.client.stateCode}`]
                : []),
            ],
          }}
          right={{
            label: "From",
            name: brand.businessName,
            lines: [
              ...(brand.legalName ? [brand.legalName] : []),
              ...brand.addressLines.slice(0, 4),
              ...(brand.contact.email ? [brand.contact.email] : []),
              ...(brand.contact.phone ? [brand.contact.phone] : []),
              ...(brand.gstin ? [`GSTIN: ${brand.gstin}`] : []),
              ...(brand.stateCode ? [`State code: ${brand.stateCode}`] : []),
              data.taxMode === "non_gst"
                ? "Standard non-GST invoice"
                : "GST tax invoice",
            ],
          }}
        />

        <Section eyebrow="Line items">
          <LineItemsTable<InvoicePdfItem>
            brand={brand}
            rows={data.items}
            columns={INVOICE_COLUMNS(data)}
          />
        </Section>

        {/* Payment confirmation + totals row */}
        <View style={paymentCardStyles.wrap} wrap={false}>
          <View
            style={[
              paymentCardStyles.card,
              ...(isPaid ? [] : [paymentCardStyles.cardEmpty]),
            ]}
          >
            <Text style={paymentCardStyles.label}>
              {isPaid ? "Payment confirmation" : "Payment instructions"}
            </Text>
            {isPaid ? (
              <>
                <Text style={paymentCardStyles.big}>
                  Paid on{" "}
                  {formatDate(data.paidAt ?? data.paymentRecordedAt)}
                </Text>
                {data.paymentMethod ? (
                  <View style={paymentCardStyles.row}>
                    <Text style={paymentCardStyles.rowLabel}>Method</Text>
                    <Text style={paymentCardStyles.rowValue}>
                      {data.paymentMethod}
                    </Text>
                  </View>
                ) : null}
                {data.paymentReference ? (
                  <View style={paymentCardStyles.row}>
                    <Text style={paymentCardStyles.rowLabel}>Reference</Text>
                    <Text style={paymentCardStyles.rowValue}>
                      {data.paymentReference}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : (
              <Text
                style={{
                  fontSize: pdfSizes.sm,
                  color: pdfColors.mutedForeground,
                }}
              >
                {data.publicUrl
                  ? "Pay online through your secure invoice link, or contact us for bank/UPI details."
                  : "Please pay using the bank or UPI details shared with this invoice."}
              </Text>
            )}
          </View>
          <TotalsBlock
            brandAccent={brand.accent}
            rows={buildTotalsRows(data, totals)}
            grand={{
              label: isPaid ? "Total paid" : "Amount due",
              value: formatCurrency(totals.total, data.currency),
            }}
          />
        </View>

        {data.notes ? (
          <NoteBlock label="Notes" accent={brand.accent}>
            {data.notes}
          </NoteBlock>
        ) : null}
        {data.terms ? (
          <NoteBlock label="Terms" accent={brand.accent}>
            {data.terms}
          </NoteBlock>
        ) : null}

        {data.seller.signature ? (
          <View style={{ alignItems: "flex-end" }}>
            <SignatureBlock
              label="Authorised signature"
              signature={data.seller.signature}
              fallbackName={brand.businessName}
            />
          </View>
        ) : null}

        <DocumentFooter
          brand={brand}
          label={`${docLabel} ${data.invoiceNumber}`}
        />
      </DocumentPage>
    </Document>
  );
}

// --- Helpers ---------------------------------------------------------------

function INVOICE_COLUMNS(data: InvoicePdfData): TableColumn<InvoicePdfItem>[] {
  return [
    {
      key: "desc",
      header: "Description",
      // Narrower description to give number columns more room.
      flex: 3,
      render: (it) => <TableCellText>{it.description}</TableCellText>,
    },
    {
      key: "qty",
      header: "Qty",
      flex: 0.7,
      align: "right",
      render: (it) => (
        <TableCellText align="right">
          {Number.isInteger(it.quantity) ? String(it.quantity) : it.quantity.toFixed(2)}
        </TableCellText>
      ),
    },
    {
      key: "rate",
      header: "Rate",
      // Wider so ₹1,50,000 style values don't visually bleed.
      flex: 1.5,
      align: "right",
      render: (it) => (
        <TableCellText align="right">
          {formatCurrency(it.unitPrice, data.currency)}
        </TableCellText>
      ),
    },
    {
      key: "gst",
      header: "GST",
      flex: 0.7,
      align: "right",
      render: (it) => (
        <TableCellText align="right">
          {data.taxMode === "non_gst" ? "—" : `${it.gstRate}%`}
        </TableCellText>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      // Widest column — always the rightmost and the largest number.
      flex: 1.6,
      align: "right",
      render: (it) => (
        <TableCellText align="right" bold>
          {formatCurrency(it.amount, data.currency)}
        </TableCellText>
      ),
    },
  ];
}

function buildTotalsRows(
  data: InvoicePdfData,
  totals: ReturnType<typeof resolveTotals>,
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [
    {
      label: "Subtotal",
      value: formatCurrency(totals.subtotal, data.currency),
    },
  ];
  if (data.taxMode === "cgst_sgst") {
    rows.push({
      label: "CGST",
      value: formatCurrency(totals.cgstAmount, data.currency),
    });
    rows.push({
      label: "SGST",
      value: formatCurrency(totals.sgstAmount, data.currency),
    });
  } else if (data.taxMode === "igst") {
    rows.push({
      label: "IGST",
      value: formatCurrency(totals.igstAmount, data.currency),
    });
  } else {
    rows.push({ label: "GST", value: "Not applicable" });
  }
  return rows;
}

function buildBrandFromData(
  data: InvoicePdfData,
  seller?: UserProfileRow | null,
  logoDataUrl?: string | null,
): ResolvedBrand {
  if (seller) {
    return resolveBrand(seller, logoDataUrl ?? data.seller.logoDataUrl);
  }
  // Synthesise a minimal UserProfileRow-shaped object so resolveBrand
  // produces a clean brand without us duplicating its logic. Falling back
  // is rare — almost every caller has a real seller row.
  const shim = {
    business_name: data.seller.businessName,
    company_name: null,
    legal_name: data.seller.legalName,
    full_name: null,
    brand_color: data.brandColor,
    brand_tagline: null,
    business_email: data.seller.email,
    email: null,
    business_phone: data.seller.phone,
    phone: null,
    website: data.seller.website,
    address_line1: data.seller.addressLines[0] ?? null,
    address_line2: data.seller.addressLines[1] ?? null,
    city: data.seller.addressLines[2] ?? null,
    postal_code: data.seller.addressLines[3] ?? null,
    country: null,
    gstin: data.seller.gstin,
    gst_number: null,
    pan: data.seller.pan,
    state_code: data.seller.stateCode,
  } as unknown as UserProfileRow;
  return resolveBrand(shim, data.seller.logoDataUrl);
}

function resolveTotals(data: InvoicePdfData) {
  const lineSubtotal = round(
    data.items.reduce((sum, item) => sum + safe(item.amount), 0),
  );
  const subtotal = pos(data.subtotal, lineSubtotal);
  const lineTax = computeLineTax(data);
  const cgstAmount = pos(data.cgstAmount, lineTax.cgst);
  const sgstAmount = pos(data.sgstAmount, lineTax.sgst);
  const igstAmount = pos(data.igstAmount, lineTax.igst);
  const taxTotal = pos(data.taxTotal, round(cgstAmount + sgstAmount + igstAmount));
  const total = pos(data.totalAmount, round(subtotal + taxTotal) || subtotal);
  const paidAmount = pos(data.paymentAmount, total);
  return { subtotal, cgstAmount, sgstAmount, igstAmount, taxTotal, total, paidAmount };
}

function computeLineTax(data: InvoicePdfData) {
  if (data.taxMode === "non_gst") return { cgst: 0, sgst: 0, igst: 0 };
  return data.items.reduce(
    (sum, item) => {
      const amount = safe(item.amount);
      const rate = safe(item.gstRate);
      if (data.taxMode === "igst") {
        sum.igst += round((amount * rate) / 100);
      } else {
        const half = round((amount * rate) / 200);
        sum.cgst += half;
        sum.sgst += half;
      }
      return sum;
    },
    { cgst: 0, sgst: 0, igst: 0 },
  );
}

function safe(value: number | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
function pos(value: number | null | undefined, fallback: number): number {
  const n = safe(value);
  return n > 0 ? n : fallback;
}
