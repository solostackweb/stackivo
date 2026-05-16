import { NextResponse } from "next/server";
import { buildWelcomeDocumentPdfDataByToken } from "@/features/documents/builders";
import { renderPdfToBuffer } from "@/features/documents/pdf/render";
import { WelcomeDocumentPdf } from "@/features/documents/pdf/welcome-document-pdf";

/**
 * Public PDF route — anonymous viewers (clients reaching us via
 * `/w/<token>`) can download the rendered guide without
 * authenticating. The capability check is the token itself, which
 * was minted server-side and emailed only to the recipient.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ token: string }>;
}

export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params;
  const data = await buildWelcomeDocumentPdfDataByToken(token);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const buffer = await renderPdfToBuffer(WelcomeDocumentPdf({ data }));
  const slug = data.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="welcome-${slug || "guide"}.pdf"`,
      "cache-control": "private, max-age=0, no-cache",
    },
  });
}
