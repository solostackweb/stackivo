import { ClientsListView } from "@/features/clients/components/clients-list-view";
import { listClients } from "@/features/clients/server";

export const metadata = { title: "Clients" };
export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await listClients({ limit: 200 });
  return <ClientsListView clients={clients} />;
}
