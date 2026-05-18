import "server-only";

/**
 * Receipt PDF.
 *
 * Generated after a payment is confirmed against an invoice (either via
 * Stackivo Managed Razorpay capture or a UPI manual confirmation). The
 * receipt is the freelancer's formal proof-of-payment to the client and
 * lives at its own URL — distinct from the invoice PDF, which keeps its
 * "TAX INVOICE" eyebrow even after payment.
 *
 * Visual language:
 *   - Top accent rule (brand).
 *   - Branded header with a green "PAID" badge in the decoration slot.
 *   - A large green "PAYMENT RECEIVED" hero block — the moment-of-truth
 *     visual that confirms the transaction at a glance.
 *   - Transaction summary grid (receipt #, paid date, method, reference).
 *   - "Billed to" / "From" party pair.
 *   - Transaction line — a one-row table reading the invoice number and
 *     paid amount. We don't repeat every invoice item here; the receipt
 *     is for the act of payment, not a re-issue of the invoice.
 *   - Notes block when present.
 *   - Branded footer.
 */

import * as React from "react";
import { Document } from "@react-pdf/renderer";
import type { ResolvedBrand } from "./brand";
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
  TableCellText,
  formatCurrency,
  formatDate,
  formatDateTime,
  type TableColumn,
} from "./primitives";

// --- Data shape ---------------------------------------------------------------

export interface ReceiptPdfData {
  receiptNumber: string;
  /** Invoice this receipt settles. */
  invoiceNumber: string;
  /** Date the payment landed (NOT the invoice issue date). */
  paidAt: string;
  /** Pretty payment-method label. */
  paymentMethod: "stackivo_managed" | "upi_manual" | string;
  /** Razorpay payment id, UPI UTR, or whatever reference is available. */
  reference: string | null;
  amount: number;
  currency: string;

  /** Optional freelancer-entered note attached to the receipt. */
  notes: string | null;

  /** Resolved brand snapshot — same shape every other PDF consumes. */
  brand: ResolvedBrand;

  /** "Billed to" identity. */
  client: {
    name: string;
    companyName: string | null;
    email: string | null;
    addressLines: string[];
    gstin: string | null;
  };
}

// --- Template ----------------------------------------------------------------

export function ReceiptPdf({ data }: { data: ReceiptPdfData }) {
  const methodLabel = labelForMethod(data.paymentMethod);
  const amountFormatted = formatCurrency(data.amount, data.currency);

  return (
    <Document
      title={`Receipt ${data.receiptNumber}`}
      author={data.brand.businessName}
      subject={`Payment receipt for invoice ${data.invoiceNumber}`}
    >
      <DocumentPage brand={data.brand}>
        <DocumentHeader
          brand={data.brand}
          eyebrow="RECEIPT"
          title={data.receiptNumber}
          subtitle={`For invoice ${data.invoiceNumber}`}
          decoration={
            <Badge tone="success" brandAccent={data.brand.accent} label="PAID" />
          }
        />

        <AmountHero
          eyebrow="Payment received"
          amount={amountFormatted}
          sub={`${methodLabel} · ${formatDateTime(data.paidAt)}`}
          variant="dark"
          brandAccent={data.brand.accent}
        />

        <MetaGrid
          items={[
            { label: "Receipt #", value: data.receiptNumber },
            { label: "Invoice #", value: data.invoiceNumber },
            { label: "Method", value: methodLabel },
            {
              label: "Reference",
              value: data.reference ?? "—",
            },
          ]}
        />

        <PartyPair
          left={{
            label: "Received from",
            name: data.client.name,
            lines: [
              ...(data.client.companyName ? [data.client.companyName] : []),
              ...data.client.addressLines.slice(0, 4),
              ...(data.client.email ? [data.client.email] : []),
              ...(data.client.gstin ? [`GSTIN: ${data.client.gstin}`] : []),
            ],
          }}
          right={{
            label: "Issued by",
            name: data.brand.businessName,
            lines: [
              ...(data.brand.legalName ? [data.brand.legalName] : []),
              ...data.brand.addressLines.slice(0, 4),
              ...(data.brand.contact.email ? [data.brand.contact.email] : []),
              ...(data.brand.gstin ? [`GSTIN: ${data.brand.gstin}`] : []),
            ],
          }}
        />

        <Section eyebrow="Transaction">
          <LineItemsTable<{ description: string; amount: number }>
            brand={data.brand}
            rows={[
              {
                description: `Payment for invoice ${data.invoiceNumber}`,
                amount: data.amount,
              },
            ]}
            columns={TRANSACTION_COLUMNS(data.currency)}
            zebra={false}
          />
        </Section>

        {data.notes ? (
          <NoteBlock label="Notes" accent={data.brand.accent}>
            {data.notes}
          </NoteBlock>
        ) : null}

        <NoteBlock label="Statement" accent={data.brand.accent}>
          This is an official receipt acknowledging payment in full of the
          amount above against invoice {data.invoiceNumber}. No signature is
          required — the receipt number serves as the official record.
        </NoteBlock>

        <DocumentFooter
          brand={data.brand}
          label={`Receipt ${data.receiptNumber}`}
        />
      </DocumentPage>
    </Document>
  );
}

// --- Helpers ----------------------------------------------------------------

function labelForMethod(method: string): string {
  switch (method) {
    case "stackivo_managed":
      return "Stackivo Managed (Razorpay)";
    case "upi_manual":
      return "UPI";
    default:
      return method;
  }
}

function TRANSACTION_COLUMNS(
  currency: string,
): TableColumn<{ description: string; amount: number }>[] {
  return [
    {
      key: "desc",
      header: "Description",
      flex: 4,
      render: (r) => <TableCellText>{r.description}</TableCellText>,
    },
    {
      key: "amt",
      header: "Amount",
      flex: 1.3,
      align: "right",
      render: (r) => (
        <TableCellText align="right" bold>
          {formatCurrency(r.amount, currency)}
        </TableCellText>
      ),
    },
  ];
}

// Re-export `formatDate` so server callers that build the data object
// don't need a parallel import.
export { formatDate };
