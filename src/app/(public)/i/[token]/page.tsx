import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PublicDocumentFrame } from "@/features/share/components/public-document-frame";
import { getSharedInvoice, recordInvoiceView } from "@/features/share/server";
import { buildInvoicePdfDataByToken } from "@/features/documents/builders";
import { getInvoicePdfShareUrl } from "@/features/documents/urls";
import { getUserPaymentMethod } from "@/features/billing/payment-methods";
import { PublicPaymentPanel } from "@/features/invoices/components/public-payment-panel";
import { PublicUpiPanel } from "@/features/invoices/components/public-upi-panel";
import { renderUpiQrSvg } from "@/features/invoices/upi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { token } = await params;
  const data = await buildInvoicePdfDataByToken(token);
  if (!data) return { title: "Invoice not found" };
  return {
    title: `Invoice ${data.invoiceNumber}`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicInvoicePage({ params }: Props) {
  const { token } = await params;
  const [shared, viewModel] = await Promise.all([
    getSharedInvoice(token),
    buildInvoicePdfDataByToken(token),
  ]);
  if (!shared || !viewModel) notFound();

  // Fire-and-forget: record the view (throttled to once per hour upstream).
  void recordInvoiceView(token);

  // Decide which payment panel to render based on the freelancer's
  // configured method. The 0027 model collapses the old "is razorpay
  // connected" check into a single typed enum.
  const method = await getUserPaymentMethod(shared.invoice.user_id);

  const status = shared.invoice.status;
  const tone =
    status === "paid"
      ? "bg-success/10 text-success"
      : status === "overdue"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";

  const amountFormatted = formatAmount(
    Number(shared.invoice.total_amount),
    shared.invoice.currency,
  );
  const senderName = viewModel.seller.businessName ?? "Stackivo";

  // For UPI we render the QR server-side so the SVG arrives baked into
  // the HTML — no client-side QR library bundle, no flicker.
  let upiPanelProps:
    | {
        qrSvg: string;
        vpa: string;
        upiUri: string;
      }
    | null = null;
  if (method?.type === "upi_manual") {
    const { svg, uri } = await renderUpiQrSvg({
      vpa: method.payout.vpa,
      payeeName: senderName,
      amount: Number(shared.invoice.total_amount),
      note: `Invoice ${viewModel.invoiceNumber}`,
      ref: viewModel.invoiceNumber,
    });
    upiPanelProps = { qrSvg: svg, vpa: method.payout.vpa, upiUri: uri };
  }

  return (
    <PublicDocumentFrame
      eyebrow={`Invoice ${viewModel.invoiceNumber}`}
      title={amountFormatted}
      subtitle={`From ${senderName} · Due ${viewModel.dueDate}`}
      senderName={senderName}
      statusBadge={
        <Badge
          variant="secondary"
          className={`h-5 px-1.5 text-[10px] capitalize ${tone}`}
        >
          {status}
        </Badge>
      }
      pdfUrl={getInvoicePdfShareUrl(token)}
      pdfFileName={`invoice-${viewModel.invoiceNumber}.pdf`}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-lg border bg-background">
          <iframe
            src={getInvoicePdfShareUrl(token)}
            title={`Invoice ${viewModel.invoiceNumber}`}
            className="h-[78vh] w-full"
          />
        </div>
        <aside className="space-y-4">
          {method?.type === "stackivo_managed" ? (
            <PublicPaymentPanel
              token={token}
              amountFormatted={amountFormatted}
              invoiceNumber={viewModel.invoiceNumber}
              alreadyPaid={status === "paid"}
              freelancerName={senderName}
              prefill={{
                name: viewModel.client?.name ?? undefined,
                email: viewModel.client?.email ?? undefined,
              }}
            />
          ) : method?.type === "upi_manual" && upiPanelProps ? (
            <PublicUpiPanel
              qrSvg={upiPanelProps.qrSvg}
              vpa={upiPanelProps.vpa}
              upiUri={upiPanelProps.upiUri}
              amountFormatted={amountFormatted}
              invoiceNumber={viewModel.invoiceNumber}
              alreadyPaid={status === "paid"}
            />
          ) : (
            <div className="rounded-lg border bg-card p-5 text-sm">
              <p className="font-semibold">Pay outside Stackivo</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {senderName} hasn&apos;t set up online payments yet. Please
                pay using the bank or UPI details listed on the invoice and
                let them know once it&apos;s done.
              </p>
            </div>
          )}
          <div className="rounded-lg border bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">Need help?</p>
            <p className="mt-1">
              Reply to the email this invoice came from to reach{" "}
              {senderName} directly.
            </p>
          </div>
        </aside>
      </div>
    </PublicDocumentFrame>
  );
}

function formatAmount(value: number, currency: string): string {
  if (!Number.isFinite(value)) return `${currency} 0`;
  const amt = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${currency} ${amt}`;
}
