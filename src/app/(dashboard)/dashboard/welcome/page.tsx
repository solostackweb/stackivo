import { listWelcomeDocuments } from "@/features/welcome-documents/server";
import { WelcomeListView } from "@/features/welcome-documents/components/welcome-list-view";
import { listClients } from "@/features/clients/server";
import { getClientDisplayName } from "@/features/clients/utils";

export const metadata = { title: "Welcome documents" };
export const dynamic = "force-dynamic";

export default async function WelcomeDocumentsPage() {
  const [documents, clients] = await Promise.all([
    listWelcomeDocuments(),
    listClients({ limit: 200 }),
  ]);
  return (
    <WelcomeListView
      documents={documents}
      clients={clients.map((client) => ({
        id: client.id,
        name: getClientDisplayName(client),
        email: client.email,
      }))}
    />
  );
}
