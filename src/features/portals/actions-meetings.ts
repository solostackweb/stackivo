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

// =============================================================================
// REQUEST MEETING  (owner or client can request)
// =============================================================================

const requestSchema = z.object({
  portalId: z.string().uuid(),
  topic: z.string().trim().min(1).max(200),
  proposedTime: z.string().trim().max(200).optional(),
  meetLink: z.string().trim().url().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(4000).optional(),
});

export async function requestPortalMeetingAction(
  input: z.infer<typeof requestSchema>,
): Promise<ActionResult<{ meetingId: string }>> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const access = await requirePortalAccess(parsed.data.portalId).catch(
    (e) => e as PortalAccessError,
  );
  if (access instanceof PortalAccessError) {
    return { ok: false, error: mapAccessError(access) };
  }

  const admin = getAdminSupabase();
  const { data: row, error } = await admin
    .from("portal_meetings")
    .insert({
      portal_id: parsed.data.portalId,
      requested_by: access.userId,
      topic: parsed.data.topic,
      proposed_time: parsed.data.proposedTime ?? null,
      meet_link: parsed.data.meetLink || null,
      notes: parsed.data.notes ?? null,
      status: "pending",
    } as never)
    .select("id")
    .single();

  if (error || !row) {
    return { ok: false, error: error?.message ?? "Could not request meeting." };
  }
  const meetingId = (row as { id: string }).id;

  await recordPortalActivity({
    portalId: parsed.data.portalId,
    actorId: access.userId,
    type: "meeting.requested",
    payload: { meetingId, topic: parsed.data.topic },
  });

  revalidatePath(portalClientHome(parsed.data.portalId));
  revalidatePath(portalDashboardDetail(parsed.data.portalId));
  return { ok: true, data: { meetingId } };
}

// =============================================================================
// ACCEPT MEETING  (owner only — sets meet link + status=accepted)
// =============================================================================

const acceptSchema = z.object({
  portalId: z.string().uuid(),
  meetingId: z.string().uuid(),
  meetLink: z.string().trim().max(500).optional().or(z.literal("")),
  proposedTime: z.string().trim().max(200).optional(),
});

export async function acceptPortalMeetingAction(
  input: z.infer<typeof acceptSchema>,
): Promise<ActionResult> {
  const parsed = acceptSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." };
  }

  const access = await requirePortalAccess(parsed.data.portalId, {
    requireRole: "owner",
  }).catch((e) => e as PortalAccessError);
  if (access instanceof PortalAccessError) {
    return { ok: false, error: mapAccessError(access) };
  }

  const admin = getAdminSupabase();
  const { error } = await admin
    .from("portal_meetings")
    .update({
      status: "accepted",
      meet_link: parsed.data.meetLink || null,
      proposed_time: parsed.data.proposedTime ?? undefined,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", parsed.data.meetingId)
    .eq("portal_id", parsed.data.portalId);

  if (error) return { ok: false, error: error.message };

  await recordPortalActivity({
    portalId: parsed.data.portalId,
    actorId: access.userId,
    type: "meeting.accepted",
    payload: { meetingId: parsed.data.meetingId },
  });

  revalidatePath(portalClientHome(parsed.data.portalId));
  revalidatePath(portalDashboardDetail(parsed.data.portalId));
  return { ok: true, message: "Meeting accepted." };
}

// =============================================================================
// DECLINE MEETING  (owner only)
// =============================================================================

export async function declinePortalMeetingAction(input: {
  portalId: string;
  meetingId: string;
}): Promise<ActionResult> {
  const access = await requirePortalAccess(input.portalId, {
    requireRole: "owner",
  }).catch((e) => e as PortalAccessError);
  if (access instanceof PortalAccessError) {
    return { ok: false, error: mapAccessError(access) };
  }

  const admin = getAdminSupabase();
  await admin
    .from("portal_meetings")
    .update({ status: "declined", updated_at: new Date().toISOString() } as never)
    .eq("id", input.meetingId)
    .eq("portal_id", input.portalId);

  await recordPortalActivity({
    portalId: input.portalId,
    actorId: access.userId,
    type: "meeting.declined",
    payload: { meetingId: input.meetingId },
  });

  revalidatePath(portalClientHome(input.portalId));
  revalidatePath(portalDashboardDetail(input.portalId));
  return { ok: true };
}

// =============================================================================
// COMPLETE MEETING  (owner only)
// =============================================================================

export async function completePortalMeetingAction(input: {
  portalId: string;
  meetingId: string;
}): Promise<ActionResult> {
  const access = await requirePortalAccess(input.portalId, {
    requireRole: "owner",
  }).catch((e) => e as PortalAccessError);
  if (access instanceof PortalAccessError) {
    return { ok: false, error: mapAccessError(access) };
  }

  const admin = getAdminSupabase();
  await admin
    .from("portal_meetings")
    .update({ status: "completed", updated_at: new Date().toISOString() } as never)
    .eq("id", input.meetingId)
    .eq("portal_id", input.portalId);

  await recordPortalActivity({
    portalId: input.portalId,
    actorId: access.userId,
    type: "meeting.completed",
    payload: { meetingId: input.meetingId },
  });

  revalidatePath(portalClientHome(input.portalId));
  revalidatePath(portalDashboardDetail(input.portalId));
  return { ok: true };
}

// =============================================================================
// CANCEL MEETING  (any portal member can cancel their own request)
// =============================================================================

export async function cancelPortalMeetingAction(input: {
  portalId: string;
  meetingId: string;
}): Promise<ActionResult> {
  const access = await requirePortalAccess(input.portalId).catch(
    (e) => e as PortalAccessError,
  );
  if (access instanceof PortalAccessError) {
    return { ok: false, error: mapAccessError(access) };
  }

  const admin = getAdminSupabase();
  const { data: meeting } = await admin
    .from("portal_meetings")
    .select("requested_by, status")
    .eq("id", input.meetingId)
    .eq("portal_id", input.portalId)
    .maybeSingle();

  const m = meeting as { requested_by: string; status: string } | null;
  if (!m) return { ok: false, error: "Meeting not found." };
  // Only the requester or the owner can cancel
  if (m.requested_by !== access.userId && access.role !== "owner") {
    return { ok: false, error: "You can only cancel your own meeting requests." };
  }
  if (m.status === "completed") {
    return { ok: false, error: "Cannot cancel a completed meeting." };
  }

  await admin
    .from("portal_meetings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() } as never)
    .eq("id", input.meetingId)
    .eq("portal_id", input.portalId);

  revalidatePath(portalClientHome(input.portalId));
  revalidatePath(portalDashboardDetail(input.portalId));
  return { ok: true };
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
