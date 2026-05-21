import "server-only";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { portalClientHome, portalDashboardDetail } from "./routes";
import { recordPortalActivity } from "./server";
import type { ActionResult } from "@/features/invoices/delivery";

export async function acceptPortalInvitation(
  token: string,
): Promise<ActionResult<{ portalId: string; alreadyMember: boolean }>> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must sign in to accept." };

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const admin = getAdminSupabase();
  const { data: invRow } = await admin
    .from("portal_invitations")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  const inv = invRow as
    | {
        id: string;
        portal_id: string;
        email: string;
        expires_at: string;
        accepted_at: string | null;
      }
    | null;

  if (!inv) return { ok: false, error: "Invitation not found." };
  if (Date.parse(inv.expires_at) < Date.now()) {
    return { ok: false, error: "This invitation has expired." };
  }

  const { data: existingMemberRows } = (await admin
    .from("portal_members")
    .select("user_id, revoked_at")
    .eq("portal_id", inv.portal_id)
    .is("revoked_at", null)) as {
    data: Array<{ user_id: string; revoked_at: string | null }> | null;
  };
  if (
    existingMemberRows &&
    existingMemberRows.some((m) => m.user_id !== user.id)
  ) {
    return {
      ok: false,
      error: "This portal already has a client assigned.",
    };
  }

  if (inv.email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return {
      ok: false,
      error:
        "This invitation was sent to a different email. Sign in with that address to accept.",
    };
  }

  const { data: existing } = await admin
    .from("portal_members")
    .select("portal_id, revoked_at")
    .eq("portal_id", inv.portal_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    if ((existing as { revoked_at: string | null }).revoked_at) {
      await admin
        .from("portal_members")
        .update({ revoked_at: null, joined_at: new Date().toISOString() } as never)
        .eq("portal_id", inv.portal_id)
        .eq("user_id", user.id);
    }
    if (!inv.accepted_at) {
      await admin
        .from("portal_invitations")
        .update({
          accepted_at: new Date().toISOString(),
          accepted_by: user.id,
        } as never)
        .eq("id", inv.id);
    }
    return {
      ok: true,
      data: { portalId: inv.portal_id, alreadyMember: true },
      message: "You're already a member of this portal.",
    };
  }

  await admin.from("portal_members").insert({
    portal_id: inv.portal_id,
    user_id: user.id,
    role: "client",
    joined_at: new Date().toISOString(),
  } as never);

  await admin
    .from("portal_invitations")
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    } as never)
    .eq("id", inv.id);

  await recordPortalActivity({
    portalId: inv.portal_id,
    actorId: user.id,
    type: "portal.member_joined",
    payload: { email: user.email },
  });

  revalidatePath(portalClientHome(inv.portal_id));
  revalidatePath(portalDashboardDetail(inv.portal_id));
  return {
    ok: true,
    data: { portalId: inv.portal_id, alreadyMember: false },
    message: "Welcome - you're in.",
  };
}
