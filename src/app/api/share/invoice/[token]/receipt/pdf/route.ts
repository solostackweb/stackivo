import { NextResponse } from "next/server";
import { buildReceiptPdfDataByToken } from "@/features/documents/builders";
import { renderPdfToBuffer } from "@/features/documents/pdf/render";
import { ReceiptPdf } from "@/features/documents/pdf/receipt-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ token: string }>;
}

/**
 * Public receipt PDF — anyone with the invoice's public token can
 * fetch the receipt once a payment has been recorded. Same token that
 * resolves the public invoice page works here.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params;
  const data = await buildReceiptPdfDataByToken(token);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const buffer = await renderPdfToBuffer(ReceiptPdf({ data }));
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="receipt-${data.receiptNumber}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
