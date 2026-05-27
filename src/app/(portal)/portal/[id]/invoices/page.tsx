import { getClientPortalProps } from "@/features/portals/client-portal-data";
import { ClientPortalInvoices } from "@/features/portals/components/client-portal-pages";

export const metadata = { title: "Portal invoices" };
export const dynamic = "force-dynamic";

export default async function ClientPortalInvoicesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getClientPortalProps(id);

  return <ClientPortalInvoices data={data} />;
}
