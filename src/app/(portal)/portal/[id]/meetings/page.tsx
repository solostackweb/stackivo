import { getClientPortalProps } from "@/features/portals/client-portal-data";
import { ClientPortalMeetings } from "@/features/portals/components/client-portal-pages";

export const metadata = { title: "Portal meetings" };
export const dynamic = "force-dynamic";

export default async function ClientPortalMeetingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getClientPortalProps(id);

  return <ClientPortalMeetings data={data} />;
}
