import "server-only";

/**
 * Server-side helpers for the Client Portal feature.
 *
 * The single source of truth for "who can see / write what" is
 * `requirePortalAccess(portalId, role?)`. Every server action and route
 * handler MUST call it before reading or mutating portal data. RLS is the
 * back-stop, not the only line of defence — application-layer guards give
 * us better error messages and resist subtle policy regressions.
 */

import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { AUTH_LOGIN_ROUTE } from "@/features/auth/routes";
import type {
  PortalRow,
  PortalMemberRow,
  PortalRole,
} from "@/lib/supabase/types";

export class PortalAccessError extends Error {
  code: "unauthenticated" | "forbidden" | "not_found";
  constructor(code: "unauthenticated" | "forbidden" | "not_found", msg?: string) {
    super(msg ?? code);
    this.code = code;
    this.name = "PortalAccessError";
  }
}

export interface PortalAccess {
  userId: string;
  portal: PortalRow;
  /** "owner" iff the freelancer who owns the portal. */
  role: PortalRole;
  /** Membership row (null for the owner — they don't need one). */
  member: PortalMemberRow | null;
}

/**
 * Throws unless the current user is either:
 *   - the freelancer (owner) who created the portal, OR
 *   - an active (non-revoked) member of the portal.
 *
 * Pass `requireRole: "owner"` when the action is freelancer-only
 * (e.g. inviting members, attaching invoices).
 */
export async function requirePortalAccess(
  portalId: string,
  opts?: { requireRole?: PortalRole; redirectIfUnauth?: boolean },
): Promise<PortalAccess> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (opts?.redirectIfUnauth) redirect(AUTH_LOGIN_ROUTE);
    throw new PortalAccessError("unauthenticated");
  }

  // We use the *admin* client here so a buggy RLS policy can't silently
  // hide a row we're explicitly authorising in the application layer.
  // The user-id check below is the actual gate.
  const admin = getAdminSupabase();
  const { data: portalRow } = await admin
    .from("portals")
    .select("*")
    .eq("id", portalId)
    .is("deleted_at", null)
    .maybeSingle();
  const portal = portalRow as PortalRow | null;
  if (!portal) throw new PortalAccessError("not_found");

  // Owner branch
  if (portal.owner_user_id === user.id) {
    return { userId: user.id, portal, role: "owner", member: null };
  }

  // If the action requires owner, fail fast.
  if (opts?.requireRole === "owner") {
    throw new PortalAccessError("forbidden");
  }

  // Member branch
  const { data: memberRow } = await admin
    .from("portal_members")
    .select("*")
    .eq("portal_id", portalId)
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .maybeSingle();
  const member = memberRow as PortalMemberRow | null;
  if (!member) throw new PortalAccessError("forbidden");

  if (opts?.requireRole && member.role !== opts.requireRole) {
    throw new PortalAccessError("forbidden");
  }

  return { userId: user.id, portal, role: member.role, member };
}

/**
 * List every portal visible to the current user.
 *
 *   - Freelancer (owner): every portal where they are owner.
 *   - Client: every portal where they are an active member.
 *
 * The two sets are mutually exclusive in practice (a freelancer wouldn't
 * be both owner and client of the same portal), so we union them with a
 * de-dupe by id.
 */
export async function listPortalsForCurrentUser(): Promise<{
  ownedPortals: PortalRow[];
  memberPortals: PortalRow[];
  user: { id: string; email: string | null } | null;
}> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ownedPortals: [], memberPortals: [], user: null };
  }

  // RLS will scope these reads naturally — but we *also* filter by
  // owner_user_id explicitly so the SQL stays cheap (an index lookup
  // rather than a full RLS-driven scan).
  const { data: owned } = await supabase
    .from("portals")
    .select("*")
    .eq("owner_user_id", user.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  const { data: memberRows } = await supabase
    .from("portal_members")
    .select("portal_id, role, revoked_at, portals!inner(*)")
    .eq("user_id", user.id)
    .is("revoked_at", null);

  const memberPortals: PortalRow[] = [];
  for (const row of (memberRows ?? []) as unknown as Array<{
    portals: PortalRow | PortalRow[] | null;
  }>) {
    const p = Array.isArray(row.portals) ? row.portals[0] : row.portals;
    if (p && !p.deleted_at) memberPortals.push(p);
  }

  return {
    ownedPortals: ((owned ?? []) as unknown as PortalRow[]).filter(
      (p) => !p.deleted_at,
    ),
    memberPortals,
    user: { id: user.id, email: user.email ?? null },
  };
}

export interface PortalSnapshot {
  access: PortalAccess;
  members: Array<
    PortalMemberRow & {
      profile: { full_name: string | null; email: string | null } | null;
    }
  >;
  pendingInvitations: Array<{
    id: string;
    email: string;
    expires_at: string;
    accepted_at: string | null;
  }>;
  files: Array<import("@/lib/supabase/types").PortalFileRow>;
  storageUsage: { totalBytes: number; fileCount: number };
  messages: Array<
    import("@/lib/supabase/types").PortalMessageRow & {
      author: { full_name: string | null; email: string | null } | null;
    }
  >;
  contracts: Array<{
    id: string;
    title: string;
    status: string;
    public_token: string | null;
    added_at: string;
  }>;
  invoices: Array<{
    id: string;
    invoice_number: string;
    total_amount: number;
    currency: string;
    status: string;
    public_token: string | null;
    added_at: string;
  }>;
  welcomeDocuments: Array<{
    id: string;
    title: string;
    status: string;
    public_token: string | null;
    acknowledgement_required: boolean;
    added_at: string;
  }>;
  activity: Array<import("@/lib/supabase/types").PortalActivityRow>;
}

/**
 * Bulk-load every entity attached to a portal. Used by both the
 * freelancer-side detail page and the client-side workspace home.
 *
 * Throws (via `requirePortalAccess`) if the caller doesn't have access.
 */
export async function getPortalSnapshot(
  portalId: string,
): Promise<PortalSnapshot> {
  const access = await requirePortalAccess(portalId);
  const admin = getAdminSupabase();

  const [
    membersRes,
    invitesRes,
    filesRes,
    usageRes,
    messagesRes,
    contractsRes,
    invoicesRes,
    welcomeDocsRes,
    activityRes,
  ] = await Promise.all([
    admin
      .from("portal_members")
      .select("*")
      .eq("portal_id", portalId)
      .is("revoked_at", null)
      .order("invited_at", { ascending: true }),
    admin
      .from("portal_invitations")
      .select("id, email, expires_at, accepted_at")
      .eq("portal_id", portalId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
    admin
      .from("portal_files")
      .select("*")
      .eq("portal_id", portalId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(500),
    admin
      .from("portal_storage_usage")
      .select("total_bytes, file_count")
      .eq("portal_id", portalId)
      .maybeSingle(),
    admin
      .from("portal_messages")
      .select("*")
      .eq("portal_id", portalId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("portal_contracts")
      .select("contract_id, added_at, contracts!inner(id, title, status, public_token)")
      .eq("portal_id", portalId),
    admin
      .from("portal_invoices")
      .select(
        "invoice_id, added_at, invoices!inner(id, invoice_number, total_amount, currency, status, public_token)",
      )
      .eq("portal_id", portalId),
    admin
      .from("portal_welcome_documents")
      .select(
        "document_id, added_at, welcome_documents!inner(id, title, status, public_token, acknowledgement_required)",
      )
      .eq("portal_id", portalId),
    admin
      .from("portal_activity")
      .select("*")
      .eq("portal_id", portalId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  // Hydrate member profiles in one query so the detail page can show
  // friendly names rather than UUIDs.
  const memberRows = (membersRes.data ?? []) as PortalMemberRow[];
  const userIds = Array.from(new Set(memberRows.map((m) => m.user_id)));
  const profiles = userIds.length
    ? (
        await admin
          .from("user_profiles")
          .select("id, full_name, email")
          .in("id", userIds)
      ).data ?? []
    : [];
  const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
  for (const p of profiles as Array<{
    id: string;
    full_name: string | null;
    email: string | null;
  }>) {
    profileMap.set(p.id, { full_name: p.full_name, email: p.email });
  }

  // Hydrate message authors similarly.
  const messageRows = (messagesRes.data ??
    []) as import("@/lib/supabase/types").PortalMessageRow[];
  const authorIds = Array.from(new Set(messageRows.map((m) => m.author_id)));
  const missing = authorIds.filter((id) => !profileMap.has(id));
  if (missing.length) {
    const more = await admin
      .from("user_profiles")
      .select("id, full_name, email")
      .in("id", missing);
    for (const p of (more.data ?? []) as Array<{
      id: string;
      full_name: string | null;
      email: string | null;
    }>) {
      profileMap.set(p.id, { full_name: p.full_name, email: p.email });
    }
  }

  // Flatten the joined contract/invoice rows. PostgREST returns the
  // relation as either a single object or an array depending on FK
  // cardinality — we normalise to a plain object here.
  const contracts = ((contractsRes.data ?? []) as Array<{
    contract_id: string;
    added_at: string;
    contracts:
      | { id: string; title: string; status: string; public_token: string | null }
      | Array<{ id: string; title: string; status: string; public_token: string | null }>
      | null;
  }>).map((row) => {
    const c = Array.isArray(row.contracts) ? row.contracts[0] : row.contracts;
    return {
      id: c?.id ?? row.contract_id,
      title: c?.title ?? "(removed)",
      status: c?.status ?? "unknown",
      public_token: c?.public_token ?? null,
      added_at: row.added_at,
    };
  });

  const invoices = ((invoicesRes.data ?? []) as Array<{
    invoice_id: string;
    added_at: string;
    invoices:
      | {
          id: string;
          invoice_number: string;
          total_amount: number;
          currency: string;
          status: string;
          public_token: string | null;
        }
      | Array<{
          id: string;
          invoice_number: string;
          total_amount: number;
          currency: string;
          status: string;
          public_token: string | null;
        }>
      | null;
  }>).map((row) => {
    const i = Array.isArray(row.invoices) ? row.invoices[0] : row.invoices;
    return {
      id: i?.id ?? row.invoice_id,
      invoice_number: i?.invoice_number ?? "—",
      total_amount: Number(i?.total_amount ?? 0),
      currency: i?.currency ?? "INR",
      status: i?.status ?? "unknown",
      public_token: i?.public_token ?? null,
      added_at: row.added_at,
    };
  });

  const welcomeDocuments = ((welcomeDocsRes.data ?? []) as Array<{
    document_id: string;
    added_at: string;
    welcome_documents:
      | {
          id: string;
          title: string;
          status: string;
          public_token: string | null;
          acknowledgement_required: boolean;
        }
      | Array<{
          id: string;
          title: string;
          status: string;
          public_token: string | null;
          acknowledgement_required: boolean;
        }>
      | null;
  }>).map((row) => {
    const w = Array.isArray(row.welcome_documents)
      ? row.welcome_documents[0]
      : row.welcome_documents;
    return {
      id: w?.id ?? row.document_id,
      title: w?.title ?? "(removed)",
      status: w?.status ?? "unknown",
      public_token: w?.public_token ?? null,
      acknowledgement_required: w?.acknowledgement_required ?? false,
      added_at: row.added_at,
    };
  });

  const usage = (usageRes.data as { total_bytes?: number; file_count?: number } | null) ?? null;

  return {
    access,
    members: memberRows.map((m) => ({
      ...m,
      profile: profileMap.get(m.user_id) ?? null,
    })),
    pendingInvitations: (invitesRes.data ?? []) as Array<{
      id: string;
      email: string;
      expires_at: string;
      accepted_at: string | null;
    }>,
    files: (filesRes.data ?? []) as import("@/lib/supabase/types").PortalFileRow[],
    storageUsage: {
      totalBytes: usage?.total_bytes ?? 0,
      fileCount: usage?.file_count ?? 0,
    },
    messages: messageRows.map((m) => ({
      ...m,
      author: profileMap.get(m.author_id) ?? null,
    })),
    contracts,
    invoices,
    welcomeDocuments,
    activity: (activityRes.data ?? []) as import("@/lib/supabase/types").PortalActivityRow[],
  };
}

/**
 * Append a row to `portal_activity`. Always uses the admin client so the
 * write succeeds even from anonymous-ish flows (e.g. payment webhook
 * fan-out → portal activity). Read access is scoped via RLS on the
 * client side.
 */
export async function recordPortalActivity(input: {
  portalId: string;
  actorId: string | null;
  type: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const admin = getAdminSupabase();
  await admin.from("portal_activity").insert({
    portal_id: input.portalId,
    actor_id: input.actorId,
    type: input.type,
    payload: (input.payload ?? {}) as never,
  } as never);
}

/**
 * Append a row to `portal_notification_outbox`. The digest worker / future
 * cron will drain this and email recipients. We keep it isolated from the
 * generic `notifications` table so portal email digests don't compete
 * with in-app notifications.
 */
export async function queuePortalNotification(input: {
  recipientId: string;
  portalId: string | null;
  eventType: string;
  payload?: Record<string, unknown>;
  scheduledFor?: Date;
}): Promise<void> {
  const admin = getAdminSupabase();
  await admin.from("portal_notification_outbox").insert({
    recipient_id: input.recipientId,
    portal_id: input.portalId,
    event_type: input.eventType,
    payload: (input.payload ?? {}) as never,
    scheduled_for: (input.scheduledFor ?? new Date()).toISOString(),
  } as never);
}
