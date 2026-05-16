import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { buildWelcomeDocumentPdfData } from "@/features/documents/builders";
import { renderPdfToBuffer } from "@/features/documents/pdf/render";
import { WelcomeDocumentPdf } from "@/features/documents/pdf/welcome-document-pdf";

/**
 * Authenticated PDF download for a Welcome Document. The owner sees
 * a fresh render every time; we never cache because content can be
 * edited in-place between sends.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await buildWelcomeDocumentPdfData(id);
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
      "cache-control": "private, no-store",
    },
  });
}
