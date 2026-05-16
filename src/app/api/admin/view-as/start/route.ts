/**
 * POST /api/admin/view-as/start
 *
 * Body: `application/x-www-form-urlencoded` with `userId=<uuid>`.
 *
 * Wraps the server action so a `<form action="/api/admin/view-as/start">`
 * can post directly from inside the user detail page. The action
 * itself handles authz (`requireAdmin()` inside `runAdminAction`).
 */

import { NextResponse } from "next/server";
import { startViewAsAction } from "@/features/admin/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const form = await req.formData();
  const userId = String(form.get("userId") ?? "");
  const result = await startViewAsAction(userId);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  // Bounce to the user's dashboard so the admin sees what they see.
  // The view-as banner persists across the navigation.
  return NextResponse.redirect(new URL("/dashboard", req.url), 303);
}
