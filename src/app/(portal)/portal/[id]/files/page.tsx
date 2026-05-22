import { getClientPortalProps } from "@/features/portals/client-portal-data";
import { ClientPortalFiles } from "@/features/portals/components/client-portal-pages";

export const metadata = { title: "Portal files" };
export const dynamic = "force-dynamic";

export default async function ClientPortalFilesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getClientPortalProps(id);

  return <ClientPortalFiles data={data} />;
}
