import { NextResponse } from "next/server";
import { buildInvoicePdfDataByToken } from "@/features/documents/builders";
import { renderPdfToBuffer } from "@/features/documents/pdf/render";
import { InvoicePdf } from "@/features/documents/pdf/invoice-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ token: string }>;
}

export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params;
  const data = await buildInvoicePdfDataByToken(token);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const buffer = await renderPdfToBuffer(InvoicePdf({ data }));
  const slug = data.invoiceNumber
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="invoice-${slug || "invoice"}.pdf"`,
      "cache-control": "private, max-age=0, no-cache",
    },
  });
}
