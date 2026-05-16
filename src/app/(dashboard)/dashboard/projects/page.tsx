import { ProjectsListView } from "@/features/projects/components/projects-list-view";
import { listProjects } from "@/features/projects/server";
import { listClients } from "@/features/clients/server";
import { getClientDisplayName } from "@/features/clients/utils";

export const metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, clients] = await Promise.all([
    listProjects({ limit: 200 }),
    listClients({ limit: 200 }),
  ]);

  const clientOptions = clients.map((c) => ({
    id: c.id,
    name: getClientDisplayName(c),
  }));

  return <ProjectsListView projects={projects} clients={clientOptions} />;
}
