"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  PortalAccessError,
  recordPortalActivity,
  requirePortalAccess,
} from "./server";
import { portalClientHome, portalDashboardDetail } from "./routes";
import type { ActionResult } from "@/features/invoices/delivery";
import type {
  PortalUpdateType,
  PortalUpdateApprovalStatus,
  PortalUpdateReactionKind,
} from "@/lib/supabase/types";
import {
  dispatchPortalUpdatePostedComms,
  dispatchPortalUpdateApprovedComms,
  dispatchPortalRevisionRequestedComms,
} from "./email";

// =============================================================================
// CREATE UPDATE
// =============================================================================

const createUpdateSchema = z.object({
  portalId: z.string().uuid(),
  updateType: z.enum([
    "progress", "deliverable", "revision",
    "payment", "milestone", "meeting", "general",
  ]),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(8000).optional(),
  approvalStatus: z.enum([
    "none", "submitted", "under_review", "approved", "revision_requested",
  ]).optional(),
});

export async function createPortalUpdateAction(
  input: z.infer<typeof createUpdateSchema>,
): Promise<ActionResult<{ updateId: string }>> {
  const parsed = createUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const access = await requirePortalAccess(parsed.data.portalId, {
    requireRole: "owner",
  }).catch((e) => e as PortalAccessError);
  if (access instanceof PortalAccessError) {
    return { ok: false, error: mapAccessError(access) };
  }

  const admin = getAdminSupabase();
  const approvalStatus: PortalUpdateApprovalStatus =
    parsed.data.approvalStatus ??
    (parsed.data.updateType === "deliverable" ? "submitted" : "none");

  const { data: row, error } = await admin
    .from("portal_updates")
    .insert({
      portal_id: parsed.data.portalId,
      author_id: access.userId,
      update_type: parsed.data.updateType as PortalUpdateType,
      title: parsed.data.title,
      body: parsed.data.body ?? null,
      approval_status: approvalStatus,
    } as never)
    .select("id")
    .single();

  if (error || !row) {
    return { ok: false, error: error?.message ?? "Could not post update." };
  }
  const updateId = (row as { id: string }).id;

  await recordPortalActivity({
    portalId: parsed.data.portalId,
    actorId: access.userId,
    type: "update.posted",
    payload: {
      updateId,
      updateType: parsed.data.updateType,
      title: parsed.data.title,
    },
  });

  // Fire-and-forget comms (email + in-app notification for the client)
  void dispatchPortalUpdatePostedComms({
    portalId: parsed.data.portalId,
    actorUserId: access.userId,
    updateTitle: parsed.data.title,
    updateType: parsed.data.updateType,
    body: parsed.data.body ?? null,
    idempotencyKey: `update_posted:${updateId}`,
  });

  revalidatePath(portalClientHome(parsed.data.portalId));
  revalidatePath(portalDashboardDetail(parsed.data.portalId));
  return { ok: true, data: { updateId } };
}

// =============================================================================
// DELETE UPDATE (soft)
// =============================================================================

export async function deletePortalUpdateAction(input: {
  portalId: string;
  updateId: string;
}): Promise<ActionResult> {
  const access = await requirePortalAccess(input.portalId, {
    requireRole: "owner",
  }).catch((e) => e as PortalAccessError);
  if (access instanceof PortalAccessError) {
    return { ok: false, error: mapAccessError(access) };
  }

  const admin = getAdminSupabase();
  await admin
    .from("portal_updates")
    .update({ deleted_at: new Date().toISOString() } as never)
    .eq("id", input.updateId)
    .eq("portal_id", input.portalId);

  revalidatePath(portalClientHome(input.portalId));
  revalidatePath(portalDashboardDetail(input.portalId));
  return { ok: true };
}

// =============================================================================
// REACT (acknowledge / comment / approve / revision_requested)
// =============================================================================

const reactSchema = z.object({
  portalId: z.string().uuid(),
  updateId: z.string().uuid(),
  kind: z.enum(["acknowledged", "comment", "approved", "revision_requested"]),
  body: z.string().trim().max(4000).optional(),
});

export async function reactToPortalUpdateAction(
  input: z.infer<typeof reactSchema>,
): Promise<ActionResult<{ reactionId: string }>> {
  const parsed = reactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." };
  }

  const access = await requirePortalAccess(parsed.data.portalId).catch(
    (e) => e as PortalAccessError,
  );
  if (access instanceof PortalAccessError) {
    return { ok: false, error: mapAccessError(access) };
  }

  const admin = getAdminSupabase();

  // For status-changing reactions (non-comment), upsert so a user can only
  // have one acknowledge/approve/revision per update.
  if (parsed.data.kind !== "comment") {
    const { data: existing } = await admin
      .from("portal_update_reactions")
      .select("id")
      .eq("update_id", parsed.data.updateId)
      .eq("user_id", access.userId)
      .eq("kind", parsed.data.kind)
      .maybeSingle();

    if (existing) {
      // Already reacted — idempotent success
      return { ok: true, data: { reactionId: (existing as { id: string }).id } };
    }
  }

  const { data: row, error } = await admin
    .from("portal_update_reactions")
    .insert({
      update_id: parsed.data.updateId,
      user_id: access.userId,
      kind: parsed.data.kind as PortalUpdateReactionKind,
      body: parsed.data.body ?? null,
    } as never)
    .select("id")
    .single();

  if (error || !row) {
    return { ok: false, error: error?.message ?? "Could not save reaction." };
  }
  const reactionId = (row as { id: string }).id;

  // Reflect approval/revision status onto the parent update row.
  if (parsed.data.kind === "approved") {
    await admin
      .from("portal_updates")
      .update({ approval_status: "approved", updated_at: new Date().toISOString() } as never)
      .eq("id", parsed.data.updateId);
  } else if (parsed.data.kind === "revision_requested") {
    await admin
      .from("portal_updates")
      .update({ approval_status: "revision_requested", updated_at: new Date().toISOString() } as never)
      .eq("id", parsed.data.updateId);
  } else if (parsed.data.kind === "acknowledged") {
    // Only advance to under_review if still at submitted
    await admin
      .from("portal_updates")
      .update({ approval_status: "under_review", updated_at: new Date().toISOString() } as never)
      .eq("id", parsed.data.updateId)
      .eq("approval_status", "submitted");
  }

  await recordPortalActivity({
    portalId: parsed.data.portalId,
    actorId: access.userId,
    type: `update.${parsed.data.kind}`,
    payload: { updateId: parsed.data.updateId, kind: parsed.data.kind },
  });

  // Fetch the update title for comms
  if (parsed.data.kind === "approved" || parsed.data.kind === "revision_requested") {
    const admin2 = getAdminSupabase();
    const { data: updateRow } = await admin2
      .from("portal_updates")
      .select("title")
      .eq("id", parsed.data.updateId)
      .maybeSingle();
    const updateTitle = (updateRow as { title: string } | null)?.title ?? "Update";

    if (parsed.data.kind === "approved") {
      void dispatchPortalUpdateApprovedComms({
        portalId: parsed.data.portalId,
        actorUserId: access.userId,
        approverName: null, // resolved from profile in email.ts
        updateTitle,
        comment: parsed.data.body ?? null,
        idempotencyKey: `update_approved:${reactionId}`,
      });
    } else {
      void dispatchPortalRevisionRequestedComms({
        portalId: parsed.data.portalId,
        actorUserId: access.userId,
        requesterName: null, // resolved from profile in email.ts
        updateTitle,
        comment: parsed.data.body ?? null,
        idempotencyKey: `update_revision:${reactionId}`,
      });
    }
  }

  revalidatePath(portalClientHome(parsed.data.portalId));
  revalidatePath(portalDashboardDetail(parsed.data.portalId));
  return { ok: true, data: { reactionId } };
}

// =============================================================================
// helpers
// =============================================================================

function mapAccessError(err: PortalAccessError): string {
  switch (err.code) {
    case "unauthenticated": return "Please sign in.";
    case "forbidden":       return "You don't have permission to do that.";
    case "not_found":       return "Portal not found.";
  }
}
