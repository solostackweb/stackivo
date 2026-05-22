import { getClientPortalProps } from "@/features/portals/client-portal-data";
import { ClientPortalMore } from "@/features/portals/components/client-portal-pages";

export const metadata = { title: "Portal" };
export const dynamic = "force-dynamic";

export default async function ClientPortalMorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getClientPortalProps(id);

  return <ClientPortalMore data={data} />;
}
