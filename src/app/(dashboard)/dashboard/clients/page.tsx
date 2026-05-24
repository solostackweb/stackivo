import { ClientsListView } from "@/features/clients/components/clients-list-view";
import { listClients } from "@/features/clients/server";

export const metadata = { title: "Clients" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ create?: string }>;
}

export default async function ClientsPage({ searchParams }: Props) {
  const [clients, sp] = await Promise.all([
    listClients({ limit: 200 }),
    searchParams,
  ]);
  return <ClientsListView clients={clients} autoCreate={sp.create === "1"} />;
}
