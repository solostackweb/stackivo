/**
 * POST /api/admin/view-as/stop
 *
 * Clears the view-as cookie and bounces back to the user detail page
 * (referer) or `/admin/users` if there's no referer.
 */

import { NextResponse } from "next/server";
import { stopViewAsAction } from "@/features/admin/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  await stopViewAsAction();
  const referer = req.headers.get("referer");
  const back =
    referer && new URL(referer).origin === new URL(req.url).origin
      ? referer
      : new URL("/admin/users", req.url).toString();
  return NextResponse.redirect(back, 303);
}
