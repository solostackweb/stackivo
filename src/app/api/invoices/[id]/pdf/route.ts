import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { buildInvoicePdfData } from "@/features/documents/builders";
import { renderPdfToBuffer } from "@/features/documents/pdf/render";
import { InvoicePdf } from "@/features/documents/pdf/invoice-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * Authenticated PDF download for an invoice. Returns 404 for invoices
 * the caller doesn't own (RLS enforces this through `getInvoice()`).
 */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await buildInvoicePdfData(id);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await renderPdfToBuffer(InvoicePdf({ data }));
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="invoice-${data.invoiceNumber}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
