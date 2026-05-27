import { getClientPortalProps } from "@/features/portals/client-portal-data";
import { ClientPortalChat } from "@/features/portals/components/client-portal-pages";

export const metadata = { title: "Portal chat" };
export const dynamic = "force-dynamic";

export default async function ClientPortalChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getClientPortalProps(id);

  return <ClientPortalChat data={data} />;
}
