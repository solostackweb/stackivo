import "server-only";

/**
 * Activity timeline service.
 *
 * `recordActivity()` is the canonical way for any module to write to the
 * cross-cutting `activity_events` table. It silently swallows insertion
 * errors so a failed log never breaks a successful business mutation.
 *
 * The reverse path — reading the timeline — is `listActivity()`.
 */

import { getServerSupabase } from "@/lib/supabase/server";
import type {
  ActivityEntityType,
  ActivityEventRow,
  Json,
} from "@/lib/supabase/types";

export interface RecordActivityInput {
  kind: string;
  entityType: ActivityEntityType;
  entityId?: string | null;
  title: string;
  message?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ActivityRecord {
  id: string;
  kind: string;
  entityType: ActivityEntityType;
  entityId: string | null;
  title: string;
  message: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

function mapRow(row: ActivityEventRow): ActivityRecord {
  return {
    id: row.id,
    kind: row.kind,
    entityType: row.entity_type,
    entityId: row.entity_id,
    title: row.title,
    message: row.message,
    metadata: (row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : {}),
    createdAt: row.created_at,
  };
}

export async function recordActivity(input: RecordActivityInput): Promise<void> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const insertRow = {
    user_id: user.id,
    kind: input.kind,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    title: input.title,
    message: input.message ?? null,
    metadata: (input.metadata ?? {}) as Json,
  };

  // Fire-and-forget — never let a logging failure break the parent action.
  await supabase.from("activity_events").insert(insertRow as never);
}

export interface ListActivityOptions {
  entityType?: ActivityEntityType;
  entityId?: string;
  limit?: number;
}

export async function listActivity(
  opts: ListActivityOptions = {},
): Promise<ActivityRecord[]> {
  const supabase = await getServerSupabase();
  let q = supabase
    .from("activity_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 25);
  if (opts.entityType) q = q.eq("entity_type", opts.entityType);
  if (opts.entityId) q = q.eq("entity_id", opts.entityId);

  const { data, error } = await q;
  if (error || !data) return [];
  return (data as unknown as ActivityEventRow[]).map(mapRow);
}
