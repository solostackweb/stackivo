import { TimeDashboardView } from "@/features/time/components/time-dashboard-view";
import { getRunningTimer, listTimeEntries } from "@/features/time/server";
import { listProjects } from "@/features/projects/server";
import { listClients } from "@/features/clients/server";

export const metadata = { title: "Time" };
export const dynamic = "force-dynamic";

export default async function TimePage() {
  const [entries, runningTimer, projects, clients] = await Promise.all([
    listTimeEntries({ limit: 200 }),
    getRunningTimer(),
    listProjects({ limit: 200 }),
    listClients({ limit: 200 }),
  ]);

  return (
    <TimeDashboardView
      entries={entries}
      runningTimer={runningTimer}
      projects={projects.map((p) => ({
        id: p.id,
        name: p.name,
        clientId: p.clientId,
      }))}
      clients={clients.map((c) => ({
        id: c.id,
        name: c.businessName ?? c.fullName,
      }))}
    />
  );
}
