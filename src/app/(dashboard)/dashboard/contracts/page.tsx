import { ContractsListView } from "@/features/contracts/components/contracts-list-view";
import { listContracts } from "@/features/contracts/server";
import { listClients } from "@/features/clients/server";
import { listProjects } from "@/features/projects/server";
import { getClientDisplayName } from "@/features/clients/utils";

export const metadata = { title: "Contracts" };
export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const [contracts, clients, projects] = await Promise.all([
    listContracts({ limit: 200 }),
    listClients({ limit: 200 }),
    listProjects({ limit: 200 }),
  ]);
  return (
    <ContractsListView
      contracts={contracts}
      clients={clients.map((c) => ({
        id: c.id,
        name: getClientDisplayName(c),
        email: c.email,
      }))}
      projects={projects.map((p) => ({
        id: p.id,
        name: p.name,
        clientId: p.clientId,
      }))}
    />
  );
}
