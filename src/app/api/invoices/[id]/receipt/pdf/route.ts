import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { buildReceiptPdfData } from "@/features/documents/builders";
import { renderPdfToBuffer } from "@/features/documents/pdf/render";
import { ReceiptPdf } from "@/features/documents/pdf/receipt-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * Authenticated PDF download for an invoice's receipt.
 *
 * 404 if the invoice has no captured payment yet — receipts are only
 * generated after `generateReceiptForInvoice(...)` writes the row.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await buildReceiptPdfData(id);
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
