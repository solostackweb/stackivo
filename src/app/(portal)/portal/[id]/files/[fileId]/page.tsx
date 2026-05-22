import { notFound } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  PortalAccessError,
  requirePortalAccess,
} from "@/features/portals/server";
import { PortalFileViewer } from "@/features/portals/components/portal-file-viewer";

export const metadata = { title: "File preview" };
export const dynamic = "force-dynamic";

export default async function PortalFileViewerPage({
  params,
}: {
  params: Promise<{ id: string; fileId: string }>;
}) {
  const { id, fileId } = await params;

  const access = await requirePortalAccess(id).catch(
    (err) => err as PortalAccessError,
  );
  if (access instanceof PortalAccessError) notFound();

  const admin = getAdminSupabase();
  const { data } = await admin
    .from("portal_files")
    .select("id, name, mime_type, deleted_at")
    .eq("id", fileId)
    .eq("portal_id", id)
    .maybeSingle();
  const file = data as {
    id: string;
    name: string;
    mime_type: string | null;
    deleted_at: string | null;
  } | null;

  if (!file || file.deleted_at) notFound();

  const baseUrl = `/api/portals/${id}/files/${file.id}/download`;

  return (
    <PortalFileViewer
      portalId={id}
      title={file.name}
      mimeType={file.mime_type}
      previewUrl={`${baseUrl}?preview=1`}
      downloadUrl={baseUrl}
    />
  );
}
