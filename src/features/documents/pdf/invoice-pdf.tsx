import "server-only";

import * as React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ContractSignatureReference } from "@/features/contracts/signatures";
import { pdfColors, pdfFonts, pdfSizes } from "./theme";

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
  seller: InvoicePdfSeller & {
    signature: (ContractSignatureReference & {
      legalName: string | null;
      signedAt: string | null;
    }) | null;
  };
  client: InvoicePdfClient;
}

const s = StyleSheet.create({
  page: {
    fontFamily: pdfFonts.base,
    fontSize: pdfSizes.base,
    color: pdfColors.foreground,
    padding: 36,
    lineHeight: 1.45,
    backgroundColor: "#FFFFFF",
  },
  topRule: { height: 4, marginBottom: 20, borderRadius: 999 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  brand: { flexDirection: "row", alignItems: "flex-start" },
  logo: { width: 44, height: 44, objectFit: "contain", marginRight: 10 },
  brandName: { fontFamily: pdfFonts.bold, fontSize: 15, marginBottom: 2 },
  brandMeta: { fontSize: 8.5, color: pdfColors.mutedForeground, marginTop: 1 },
  titleBlock: { width: 220, alignItems: "flex-end" },
  title: {
    fontFamily: pdfFonts.bold,
    fontSize: 23,
    lineHeight: 1.18,
    letterSpacing: 0.8,
    textAlign: "right",
  },
  invoiceNumber: {
    marginTop: 9,
    fontFamily: pdfFonts.bold,
    fontSize: 10,
    color: pdfColors.foreground,
  },
  status: {
    marginTop: 12,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontFamily: pdfFonts.bold,
    fontSize: 8,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  summary: {
    flexDirection: "row",
    border: `1px solid ${pdfColors.border}`,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 18,
  },
  summaryAmount: {
    width: "36%",
    padding: 14,
    backgroundColor: pdfColors.foreground,
    color: "#FFFFFF",
  },
  summaryAmountLabel: {
    fontSize: 8,
    color: "#CBD5E1",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  summaryAmountValue: {
    marginTop: 5,
    fontFamily: pdfFonts.bold,
    fontSize: 20,
    color: "#FFFFFF",
  },
  summaryMeta: {
    flex: 1,
    flexDirection: "row",
    padding: 14,
    backgroundColor: pdfColors.subtle,
  },
  metaCell: { flex: 1, paddingRight: 10 },
  label: {
    fontSize: 8,
    color: pdfColors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.55,
    marginBottom: 4,
  },
  value: { fontFamily: pdfFonts.bold, fontSize: pdfSizes.sm },
  parties: {
    flexDirection: "row",
    marginBottom: 18,
  },
  partyCard: {
    flex: 1,
    minHeight: 92,
    border: `1px solid ${pdfColors.border}`,
    borderRadius: 6,
    padding: 12,
  },
  partySpacer: { width: 12 },
  partyName: { fontFamily: pdfFonts.bold, fontSize: 11, marginBottom: 3 },
  partyLine: { fontSize: 8.8, color: pdfColors.mutedForeground, marginTop: 2 },
  table: {
    border: `1px solid ${pdfColors.border}`,
    borderRadius: 6,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottom: `1px solid ${pdfColors.border}`,
  },
  headCell: {
    fontFamily: pdfFonts.bold,
    fontSize: 8,
    color: "#FFFFFF",
  },
  cellDesc: { flex: 3.2 },
  cellQty: { flex: 0.65, textAlign: "right" },
  cellRate: { flex: 1.1, textAlign: "right" },
  cellTax: { flex: 0.8, textAlign: "right" },
  cellAmount: { flex: 1.25, textAlign: "right" },
  itemText: { fontSize: 9 },
  totalsWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  paymentBox: {
    width: "50%",
    border: `1px solid ${pdfColors.border}`,
    borderRadius: 6,
    padding: 12,
    minHeight: 74,
  },
  totals: {
    width: 220,
    border: `1px solid ${pdfColors.border}`,
    borderRadius: 6,
    padding: 12,
    backgroundColor: pdfColors.subtle,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    fontSize: 9,
  },
  totalsLabel: { color: pdfColors.mutedForeground },
  totalsValue: { fontFamily: pdfFonts.bold },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: `1px solid ${pdfColors.border}`,
    marginTop: 6,
    paddingTop: 8,
  },
  grandLabel: { fontFamily: pdfFonts.bold, fontSize: 11 },
  grandValue: { fontFamily: pdfFonts.bold, fontSize: 13 },
  signatureWrap: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  signatureBlock: { width: 210 },
  signatureLine: {
    height: 42,
    justifyContent: "flex-end",
    borderBottom: `1px solid ${pdfColors.border}`,
    marginBottom: 6,
  },
  signatureImage: { maxHeight: 36, objectFit: "contain" },
  signatureText: { fontSize: 20 },
  notes: {
    marginTop: 16,
    borderTop: `1px solid ${pdfColors.border}`,
    paddingTop: 10,
  },
  notesText: { fontSize: 9, color: pdfColors.mutedForeground, lineHeight: 1.55 },
  footer: {
    position: "absolute",
    left: 36,
    right: 36,
    bottom: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: pdfColors.mutedForeground,
    borderTop: `1px solid ${pdfColors.border}`,
    paddingTop: 8,
  },
});

export function InvoicePdf({ data }: { data: InvoicePdfData }) {
  const accent = sanitizeColor(data.brandColor) ?? pdfColors.primary;
  const docLabel = resolveDocumentLabel(data);
  const totals = resolveTotals(data);
  const isPaid = data.status === "paid";
  const paymentDate = data.paidAt ?? data.paymentRecordedAt ?? data.dueDate;
  const amountLabel = isPaid ? "Amount paid" : "Invoice total";

  return (
    <Document
      title={`${docLabel} ${data.invoiceNumber}`}
      author={data.seller.businessName}
      subject={`${docLabel} for ${data.client.name}`}
    >
      <Page size="A4" style={s.page}>
        <View style={[s.topRule, { backgroundColor: accent }]} />

        <View style={s.header}>
          <View style={s.brand}>
            {data.seller.logoDataUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={data.seller.logoDataUrl} style={s.logo} />
            )}
            <View>
              <Text style={s.brandName}>{data.seller.businessName}</Text>
              {data.seller.legalName &&
                data.seller.legalName !== data.seller.businessName && (
                  <Text style={s.brandMeta}>{data.seller.legalName}</Text>
                )}
              {data.seller.addressLines.slice(0, 4).map((line, i) => (
                <Text key={i} style={s.brandMeta}>
                  {line}
                </Text>
              ))}
              {data.seller.email && <Text style={s.brandMeta}>{data.seller.email}</Text>}
              {data.seller.phone && <Text style={s.brandMeta}>{data.seller.phone}</Text>}
              {data.seller.gstin && <Text style={s.brandMeta}>GSTIN: {data.seller.gstin}</Text>}
              {data.seller.pan && <Text style={s.brandMeta}>PAN: {data.seller.pan}</Text>}
            </View>
          </View>

          <View style={s.titleBlock}>
            <Text style={[s.title, { color: accent }]}>{docLabel.toUpperCase()}</Text>
            <Text style={s.invoiceNumber}>{data.invoiceNumber}</Text>
            <Text
              style={[
                s.status,
                { backgroundColor: isPaid ? pdfColors.success : accent },
              ]}
            >
              {isPaid ? "Paid" : data.status.replace(/_/g, " ")}
            </Text>
          </View>
        </View>

        <View style={s.summary}>
          <View style={s.summaryAmount}>
            <Text style={s.summaryAmountLabel}>{amountLabel}</Text>
            <Text style={s.summaryAmountValue}>
              {formatCurrency(totals.paidAmount, data.currency)}
            </Text>
          </View>
          <View style={s.summaryMeta}>
            <View style={s.metaCell}>
              <Text style={s.label}>Issue date</Text>
              <Text style={s.value}>{formatDate(data.issueDate)}</Text>
            </View>
            <View style={s.metaCell}>
              <Text style={s.label}>{isPaid ? "Payment date" : "Due date"}</Text>
              <Text style={s.value}>{formatDate(isPaid ? paymentDate : data.dueDate)}</Text>
            </View>
            <View style={s.metaCell}>
              <Text style={s.label}>Document</Text>
              <Text style={s.value}>Final invoice</Text>
            </View>
          </View>
        </View>

        <View style={s.parties}>
          <View style={s.partyCard}>
            <Text style={s.label}>Billed to</Text>
            <Text style={s.partyName}>{data.client.name}</Text>
            {data.client.companyName && <Text style={s.partyLine}>{data.client.companyName}</Text>}
            {data.client.addressLines.slice(0, 4).map((line, i) => (
              <Text key={i} style={s.partyLine}>
                {line}
              </Text>
            ))}
            {data.client.email && <Text style={s.partyLine}>{data.client.email}</Text>}
            {data.client.gstin && <Text style={s.partyLine}>GSTIN: {data.client.gstin}</Text>}
            {data.client.stateCode && <Text style={s.partyLine}>State code: {data.client.stateCode}</Text>}
          </View>
          <View style={s.partySpacer} />
          <View style={s.partyCard}>
            <Text style={s.label}>From</Text>
            <Text style={s.partyName}>{data.seller.businessName}</Text>
            {data.seller.legalName && <Text style={s.partyLine}>{data.seller.legalName}</Text>}
            {data.seller.stateCode && <Text style={s.partyLine}>State code: {data.seller.stateCode}</Text>}
            {data.seller.website && <Text style={s.partyLine}>{data.seller.website}</Text>}
            {data.taxMode === "non_gst" ? (
              <Text style={s.partyLine}>Standard non-GST invoice</Text>
            ) : (
              <Text style={s.partyLine}>GST tax invoice</Text>
            )}
          </View>
        </View>

        <View style={s.table}>
          <View style={[s.tableHeader, { backgroundColor: accent }]}>
            <Text style={[s.cellDesc, s.headCell]}>Description</Text>
            <Text style={[s.cellQty, s.headCell]}>Qty</Text>
            <Text style={[s.cellRate, s.headCell]}>Rate</Text>
            <Text style={[s.cellTax, s.headCell]}>GST</Text>
            <Text style={[s.cellAmount, s.headCell]}>Amount</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={s.tableRow} wrap={false}>
              <Text style={[s.cellDesc, s.itemText]}>{item.description}</Text>
              <Text style={[s.cellQty, s.itemText]}>{formatQuantity(item.quantity)}</Text>
              <Text style={[s.cellRate, s.itemText]}>
                {formatCurrency(item.unitPrice, data.currency)}
              </Text>
              <Text style={[s.cellTax, s.itemText]}>
                {data.taxMode === "non_gst" ? "N/A" : `${item.gstRate}%`}
              </Text>
              <Text style={[s.cellAmount, s.itemText]}>
                {formatCurrency(item.amount, data.currency)}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.totalsWrap}>
          <View style={s.paymentBox}>
            <Text style={s.label}>Payment confirmation</Text>
            <Text style={s.value}>
              {isPaid
                ? `Paid on ${formatDate(paymentDate)}`
                : "Payment not recorded"}
            </Text>
            {data.paymentMethod && <Text style={s.partyLine}>Method: {data.paymentMethod}</Text>}
            {data.paymentReference && <Text style={s.partyLine}>Reference: {data.paymentReference}</Text>}
          </View>

          <View style={s.totals}>
            <TotalRow label="Subtotal" value={formatCurrency(totals.subtotal, data.currency)} />
            {data.taxMode === "cgst_sgst" && (
              <>
                <TotalRow label="CGST" value={formatCurrency(totals.cgstAmount, data.currency)} />
                <TotalRow label="SGST" value={formatCurrency(totals.sgstAmount, data.currency)} />
              </>
            )}
            {data.taxMode === "igst" && (
              <TotalRow label="IGST" value={formatCurrency(totals.igstAmount, data.currency)} />
            )}
            {data.taxMode === "non_gst" && <TotalRow label="GST" value="Not applicable" />}
            <View style={s.grandRow}>
              <Text style={s.grandLabel}>Total</Text>
              <Text style={s.grandValue}>{formatCurrency(totals.total, data.currency)}</Text>
            </View>
          </View>
        </View>

        {data.seller.signature && (
          <View style={s.signatureWrap} wrap={false}>
            <View style={s.signatureBlock}>
              <Text style={s.label}>Authorised signature</Text>
              <View style={s.signatureLine}>
                {data.seller.signature.type === "type" && data.seller.signature.textValue ? (
                  <Text style={s.signatureText}>{data.seller.signature.textValue}</Text>
                ) : data.seller.signature.imageUrl ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image src={data.seller.signature.imageUrl} style={s.signatureImage} />
                ) : null}
              </View>
              <Text style={s.value}>
                {data.seller.signature.legalName ?? data.seller.businessName}
              </Text>
              {data.seller.signature.signedAt && (
                <Text style={s.partyLine}>Signature updated {formatDate(data.seller.signature.signedAt)}</Text>
              )}
            </View>
          </View>
        )}

        {(data.notes || data.terms) && (
          <View style={s.notes}>
            {data.notes && <Text style={s.notesText}>{data.notes}</Text>}
            {data.terms && <Text style={s.notesText}>{data.terms}</Text>}
          </View>
        )}

        <View style={s.footer} fixed>
          <Text>
            {data.footerNote ?? docLabel}
            {data.classification === "b2c" ? " - B2C" : ""}
            {data.classification === "b2b" ? " - B2B" : ""}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.totalsRow}>
      <Text style={s.totalsLabel}>{label}</Text>
      <Text style={s.totalsValue}>{value}</Text>
    </View>
  );
}

function resolveDocumentLabel(data: InvoicePdfData): string {
  if (data.taxMode === "non_gst") return "Invoice";
  return "Tax Invoice";
}

function resolveTotals(data: InvoicePdfData) {
  const lineSubtotal = roundMoney(
    data.items.reduce((sum, item) => sum + safeNumber(item.amount), 0),
  );
  const subtotal = positiveOrFallback(data.subtotal, lineSubtotal);
  const lineTax = computeLineTax(data);
  const cgstAmount = positiveOrFallback(data.cgstAmount, lineTax.cgst);
  const sgstAmount = positiveOrFallback(data.sgstAmount, lineTax.sgst);
  const igstAmount = positiveOrFallback(data.igstAmount, lineTax.igst);
  const computedTax = roundMoney(cgstAmount + sgstAmount + igstAmount);
  const taxTotal = positiveOrFallback(data.taxTotal, computedTax);
  const computedTotal = roundMoney(subtotal + taxTotal);
  const total = positiveOrFallback(data.totalAmount, computedTotal || subtotal);
  const paidAmount = positiveOrFallback(data.paymentAmount, total);

  return {
    subtotal,
    cgstAmount,
    sgstAmount,
    igstAmount,
    taxTotal,
    total,
    paidAmount,
  };
}

function computeLineTax(data: InvoicePdfData) {
  if (data.taxMode === "non_gst") return { cgst: 0, sgst: 0, igst: 0 };
  return data.items.reduce(
    (sum, item) => {
      const amount = safeNumber(item.amount);
      const rate = safeNumber(item.gstRate);
      if (data.taxMode === "igst") {
        sum.igst += roundMoney((amount * rate) / 100);
      } else {
        const half = roundMoney((amount * rate) / 200);
        sum.cgst += half;
        sum.sgst += half;
      }
      return sum;
    },
    { cgst: 0, sgst: 0, igst: 0 },
  );
}

function positiveOrFallback(value: number | null | undefined, fallback: number): number {
  const n = safeNumber(value);
  return n > 0 ? n : fallback;
}

function safeNumber(value: number | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function sanitizeColor(value: string | null): string | null {
  if (!value) return null;
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : null;
}

function formatCurrency(value: number, currency: string): string {
  const amount = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${currency} ${amount}`;
}

function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Not recorded";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
