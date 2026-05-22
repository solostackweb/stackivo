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
  options: { revalidate?: boolean } = {},
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

  if (options.revalidate) {
    revalidatePath(portalClientHome(inv.portal_id));
    revalidatePath(portalDashboardDetail(inv.portal_id));
  }
  return {
    ok: true,
    data: { portalId: inv.portal_id, alreadyMember: false },
    message: "Welcome - you're in.",
  };
}

export async function getPortalInvitePreview(token: string): Promise<{
  email: string;
  portalId: string;
  portalName: string;
  expiresAt: string;
} | null> {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const admin = getAdminSupabase();
  const { data: invRow } = await admin
    .from("portal_invitations")
    .select("portal_id, email, expires_at, accepted_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  const invite = invRow as
    | {
        portal_id: string;
        email: string;
        expires_at: string;
        accepted_at: string | null;
      }
    | null;
  if (!invite || invite.accepted_at) return null;
  if (Date.parse(invite.expires_at) < Date.now()) return null;

  const { data: portalRow } = await admin
    .from("portals")
    .select("id, name")
    .eq("id", invite.portal_id)
    .is("deleted_at", null)
    .maybeSingle();
  const portal = portalRow as { id: string; name: string } | null;
  if (!portal) return null;

  return {
    email: invite.email,
    portalId: portal.id,
    portalName: portal.name,
    expiresAt: invite.expires_at,
  };
}

export async function emailHasPortalAccess(email: string): Promise<boolean> {
  return (await getPortalEmailAccessContext(email)) !== null;
}

export async function getPortalEmailAccessContext(email: string): Promise<{
  ownerUserId: string;
  portalId: string;
  portalName: string;
} | null> {
  const normalised = normalisePortalEmail(email);
  const admin = getAdminSupabase();
  const now = new Date().toISOString();

  const { data: pendingInvites } = await admin
    .from("portal_invitations")
    .select("portal_id")
    .eq("email", normalised)
    .is("accepted_at", null)
    .gt("expires_at", now)
    .limit(1);
  const invitePortalId =
    (pendingInvites?.[0] as { portal_id?: string } | undefined)?.portal_id ??
    null;
  if (invitePortalId) {
    const context = await getPortalContextById(invitePortalId);
    if (context) return context;
  }

  const { data: acceptedInvites } = await admin
    .from("portal_invitations")
    .select("portal_id")
    .eq("email", normalised)
    .not("accepted_at", "is", null)
    .order("accepted_at", { ascending: false })
    .limit(1);
  const acceptedPortalId =
    (acceptedInvites?.[0] as { portal_id?: string } | undefined)?.portal_id ??
    null;
  if (acceptedPortalId) {
    const context = await getPortalContextById(acceptedPortalId);
    if (context) return context;
  }

  const { data: profiles } = await admin
    .from("user_profiles")
    .select("id")
    .ilike("email", normalised)
    .limit(1);
  const userId = (profiles?.[0] as { id?: string } | undefined)?.id;
  if (!userId) return null;

  const { data: memberships } = await admin
    .from("portal_members")
    .select("portal_id")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .limit(1);
  const memberPortalId =
    (memberships?.[0] as { portal_id?: string } | undefined)?.portal_id ??
    null;
  if (memberPortalId) return getPortalContextById(memberPortalId);

  const { data: clientRows } = await admin
    .from("clients")
    .select("id")
    .ilike("email", normalised)
    .limit(20);
  const clientIds = ((clientRows ?? []) as Array<{ id: string }>).map(
    (client) => client.id,
  );
  if (clientIds.length === 0) return null;

  const { data: portalRows } = await admin
    .from("portals")
    .select("id, owner_user_id, name")
    .in("client_id", clientIds)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);
  const portal = (portalRows?.[0] ?? null) as
    | { id: string; owner_user_id: string; name: string }
    | null;
  return portal
    ? {
        ownerUserId: portal.owner_user_id,
        portalId: portal.id,
        portalName: portal.name,
      }
    : null;
}

export async function activatePendingPortalInvitesForCurrentUser(
  email: string,
): Promise<ActionResult<{ portalIds: string[] }>> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please request a fresh code." };
  return activatePortalAccessForUser({
    email,
    userId: user.id,
    userEmail: user.email ?? null,
  });
}

export async function activatePortalAccessForUser(input: {
  email: string;
  userId: string;
  userEmail: string | null;
}): Promise<ActionResult<{ portalIds: string[] }>> {
  const normalised = normalisePortalEmail(input.email);
  if ((input.userEmail ?? "").toLowerCase() !== normalised) {
    return {
      ok: false,
      error: "This code was verified for a different email address.",
    };
  }

  const admin = getAdminSupabase();
  const portalIds = new Set<string>();

  const { data: currentMemberships } = await admin
    .from("portal_members")
    .select("portal_id")
    .eq("user_id", input.userId)
    .is("revoked_at", null);
  for (const row of (currentMemberships ?? []) as Array<{ portal_id: string }>) {
    portalIds.add(row.portal_id);
  }

  const { data: pendingRows } = await admin
    .from("portal_invitations")
    .select("id, portal_id, accepted_at, expires_at")
    .eq("email", normalised)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(20);

  for (const inv of (pendingRows ?? []) as Array<{
    id: string;
    portal_id: string;
    accepted_at: string | null;
    expires_at: string;
  }>) {
    const { data: existingMemberRows } = (await admin
      .from("portal_members")
      .select("user_id")
      .eq("portal_id", inv.portal_id)
      .is("revoked_at", null)) as {
      data: Array<{ user_id: string }> | null;
    };
    const hasDifferentClient =
      existingMemberRows?.some((member) => member.user_id !== input.userId) ??
      false;
    if (hasDifferentClient) continue;

    await admin.from("portal_members").upsert(
      {
        portal_id: inv.portal_id,
        user_id: input.userId,
        role: "client",
        joined_at: new Date().toISOString(),
        revoked_at: null,
      } as never,
      { onConflict: "portal_id,user_id" },
    );

    await admin
      .from("portal_invitations")
      .update({
        accepted_at: new Date().toISOString(),
        accepted_by: input.userId,
      } as never)
      .eq("id", inv.id);

    await recordPortalActivity({
      portalId: inv.portal_id,
      actorId: input.userId,
      type: "portal.member_joined",
      payload: { email: input.userEmail },
    });

    portalIds.add(inv.portal_id);
  }

  const { data: clientRows } = await admin
    .from("clients")
    .select("id")
    .ilike("email", normalised)
    .limit(20);
  const clientIds = ((clientRows ?? []) as Array<{ id: string }>).map(
    (client) => client.id,
  );
  if (clientIds.length > 0) {
    const { data: linkedPortalRows } = await admin
      .from("portals")
      .select("id")
      .in("client_id", clientIds)
      .eq("status", "active")
      .is("deleted_at", null)
      .limit(20);

    for (const portal of (linkedPortalRows ?? []) as Array<{ id: string }>) {
      const { data: existingMemberRows } = (await admin
        .from("portal_members")
        .select("user_id")
        .eq("portal_id", portal.id)
        .is("revoked_at", null)) as {
        data: Array<{ user_id: string }> | null;
      };
      const hasDifferentClient =
        existingMemberRows?.some((member) => member.user_id !== input.userId) ??
        false;
      if (hasDifferentClient) continue;

      await admin.from("portal_members").upsert(
        {
          portal_id: portal.id,
          user_id: input.userId,
          role: "client",
          joined_at: new Date().toISOString(),
          revoked_at: null,
        } as never,
        { onConflict: "portal_id,user_id" },
      );
      portalIds.add(portal.id);
    }
  }

  if (portalIds.size === 0) {
    return {
      ok: false,
      error: "No active portal access was found for this email.",
    };
  }

  return { ok: true, data: { portalIds: Array.from(portalIds) } };
}

function normalisePortalEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function getPortalContextById(portalId: string): Promise<{
  ownerUserId: string;
  portalId: string;
  portalName: string;
} | null> {
  const admin = getAdminSupabase();
  const { data: portalRow } = await admin
    .from("portals")
    .select("id, owner_user_id, name")
    .eq("id", portalId)
    .is("deleted_at", null)
    .maybeSingle();
  const portal = portalRow as
    | { id: string; owner_user_id: string; name: string }
    | null;
  if (!portal) return null;
  return {
    ownerUserId: portal.owner_user_id,
    portalId: portal.id,
    portalName: portal.name,
  };
}
