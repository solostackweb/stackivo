import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/format";
import { getInvoice } from "@/features/invoices/server";
import { getClient } from "@/features/clients/server";
import { getClientDisplayName } from "@/features/clients/utils";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getInvoice(id);
  return { title: result ? `Invoice ${result.invoice.invoiceNumber}` : "Invoice" };
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getInvoice(id);
  if (!result) notFound();
  const { invoice, items } = result;
  const client = invoice.clientId ? await getClient(invoice.clientId) : null;

  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/dashboard/invoices" aria-label="Back to invoices">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="flex flex-1 items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {invoice.invoiceNumber}
              </h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Issued {fmtDate(invoice.issueDate)} · Payment date {fmtDate(invoice.dueDate)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" />
                View/download PDF
              </a>
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Bill to
              </p>
              <p className="mt-2 text-sm font-medium">
                {client ? getClientDisplayName(client) : "—"}
              </p>
              {client?.email && (
                <p className="text-xs text-muted-foreground">{client.email}</p>
              )}
              {client?.gstin && (
                <p className="text-xs text-muted-foreground tabular-nums">
                  GSTIN {client.gstin}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {formatINR(invoice.totalAmount)}
              </p>
              {invoice.taxTotal > 0 && (
                <p className="text-xs text-muted-foreground tabular-nums">
                  incl. {formatINR(invoice.taxTotal)} GST
                </p>
              )}
              {invoice.status === "paid" && (
                <p className="mt-2 text-xs text-success">
                  Paid {fmtDate(invoice.paidAt)}
                </p>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Rate</th>
                  <th className="px-4 py-2 text-right">GST</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-xs text-muted-foreground"
                    >
                      No line items
                    </td>
                  </tr>
                )}
                {items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-4 py-3">{item.description}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatINR(item.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {invoice.taxMode === "non_gst" ? "N/A" : `${item.gstRate}%`}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatINR(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-xs text-muted-foreground">
              {invoice.notes && (
                <>
                  <p className="text-[11px] font-semibold uppercase tracking-wider">
                    Notes
                  </p>
                  <p className="whitespace-pre-line">{invoice.notes}</p>
                </>
              )}
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              {invoice.terms && (
                <>
                  <p className="text-[11px] font-semibold uppercase tracking-wider">
                    Terms
                  </p>
                  <p className="whitespace-pre-line">{invoice.terms}</p>
                </>
              )}
            </div>
          </div>

          <dl className="grid gap-3 border-t pt-4 sm:grid-cols-2 sm:justify-self-end sm:max-w-sm sm:ml-auto">
            <Row label="Subtotal" value={formatINR(invoice.subtotal)} />
            {invoice.cgstAmount > 0 && (
              <Row label="CGST" value={formatINR(invoice.cgstAmount)} />
            )}
            {invoice.sgstAmount > 0 && (
              <Row label="SGST" value={formatINR(invoice.sgstAmount)} />
            )}
            {invoice.igstAmount > 0 && (
              <Row label="IGST" value={formatINR(invoice.igstAmount)} />
            )}
            <Row label="Total" value={formatINR(invoice.totalAmount)} bold />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          "text-right tabular-nums " +
          (bold ? "text-sm font-semibold" : "text-sm")
        }
      >
        {value}
      </dd>
    </>
  );
}
