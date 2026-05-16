import "server-only";

/**
 * File metadata + Supabase Storage helpers.
 *
 * Two layers:
 *   1. `public.files` — DB rows that link a stored object to a project,
 *      track its size, and gate access via RLS.
 *   2. `storage.objects` — actual binary, scoped to per-user prefix.
 *
 * Convention: every object key is `<user_id>/<entity>/<random>-<filename>`.
 * The first path segment matches the storage policies declared in
 * `supabase/migrations/0004_storage_buckets.sql`.
 */

import { randomUUID } from "node:crypto";
import { getServerSupabase } from "@/lib/supabase/server";
import type { FileRow } from "@/lib/supabase/types";

export type FileBucket =
  | "invoices"
  | "contracts"
  | "portal-files"
  | "profile-images"
  | "branding-assets";

export interface FileRecord {
  id: string;
  fileName: string;
  storagePath: string;
  fileSize: number;
  mimeType: string | null;
  projectId: string | null;
  createdAt: string;
}

function mapRow(row: FileRow): FileRecord {
  return {
    id: row.id,
    fileName: row.file_name,
    storagePath: row.storage_path,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    projectId: row.project_id,
    createdAt: row.created_at,
  };
}

/**
 * Build a deterministic-but-unique object key for the current user.
 *   <user_id>/<entity>/<uuid>-<safe-name>
 */
export function buildObjectKey(args: {
  userId: string;
  entity: string;
  fileName: string;
}): string {
  const safe = args.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return `${args.userId}/${args.entity}/${randomUUID()}-${safe}`;
}

/**
 * Issue a one-shot signed upload URL for a Storage bucket. The browser POSTs
 * the file directly to Supabase (bypassing the Next.js server) which keeps
 * the bandwidth cost off our serverless functions.
 */
export async function createUploadUrl(args: {
  bucket: FileBucket;
  entity: string;
  fileName: string;
}): Promise<{
  bucket: FileBucket;
  path: string;
  uploadUrl: string;
  token: string;
} | null> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const path = buildObjectKey({
    userId: user.id,
    entity: args.entity,
    fileName: args.fileName,
  });

  const { data, error } = await supabase.storage
    .from(args.bucket)
    .createSignedUploadUrl(path);
  if (error || !data) return null;

  return {
    bucket: args.bucket,
    path,
    uploadUrl: data.signedUrl,
    token: data.token,
  };
}

/**
 * Issue a short-lived signed READ URL — used to render previews in the UI
 * or include in shared / portal links.
 */
export async function createDownloadUrl(args: {
  bucket: FileBucket;
  path: string;
  expiresInSeconds?: number;
}): Promise<string | null> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.storage
    .from(args.bucket)
    .createSignedUrl(args.path, args.expiresInSeconds ?? 600);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Server-side allow-list for `mime_type` written into `public.files`.
 *
 * Mirrors the per-bucket `allowed_mime_types` set in migration 0015 so
 * defense-in-depth holds even if a client somehow lands an unexpected
 * binary into Storage. Keep this superset wide enough to cover every
 * bucket the app uses.
 */
const ALLOWED_MIME_TYPES = new Set<string>([
  // Documents
  "application/pdf",
  "application/zip",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  // Images
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
]);

/** Hard cap that matches the largest bucket limit configured in storage. */
const MAX_FILE_SIZE_BYTES = 52 * 1024 * 1024; // 50 MB

/**
 * Persist file metadata after a successful upload. Call from a client-side
 * upload completion handler via a wrapping server action.
 *
 * Server-side guards (all returning `null` on violation so the action
 * surfaces a generic error to the user):
 *   - `storagePath` MUST start with `<user.id>/` — prevents an attacker
 *     from registering a metadata row pointing at another user's prefix.
 *   - `mimeType`, when present, MUST be in the allow-list.
 *   - `fileSize` must be non-negative and under the platform cap.
 */
export async function recordFileMetadata(args: {
  fileName: string;
  storagePath: string;
  fileSize: number;
  mimeType: string | null;
  projectId?: string | null;
}): Promise<FileRecord | null> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Path must live under the caller's user-scoped storage prefix.
  if (!args.storagePath.startsWith(`${user.id}/`)) return null;
  // Reject crafted MIME types not in our allow-list.
  if (args.mimeType && !ALLOWED_MIME_TYPES.has(args.mimeType)) return null;
  // Reject absurd / negative file sizes.
  if (!Number.isFinite(args.fileSize) || args.fileSize < 0) return null;
  if (args.fileSize > MAX_FILE_SIZE_BYTES) return null;

  // Clamp file-name length so a hostile client can't poison the table.
  const safeFileName = args.fileName.slice(0, 240);

  const { data, error } = await supabase
    .from("files")
    .insert({
      user_id: user.id,
      file_name: safeFileName,
      storage_path: args.storagePath,
      file_size: args.fileSize,
      mime_type: args.mimeType,
      project_id: args.projectId ?? null,
    } as never)
    .select("*")
    .single();
  if (error || !data) return null;
  return mapRow(data as unknown as FileRow);
}

export async function listProjectFiles(projectId: string): Promise<FileRecord[]> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as FileRow[]).map(mapRow);
}

export async function deleteFile(args: {
  id: string;
  bucket: FileBucket;
  path: string;
}): Promise<boolean> {
  const supabase = await getServerSupabase();
  const [{ error: storageErr }, { error: dbErr }] = await Promise.all([
    supabase.storage.from(args.bucket).remove([args.path]),
    supabase.from("files").delete().eq("id", args.id),
  ]);
  return !storageErr && !dbErr;
}
