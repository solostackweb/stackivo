import { listWelcomeDocuments } from "@/features/welcome-documents/server";
import { WelcomeListView } from "@/features/welcome-documents/components/welcome-list-view";

export const metadata = { title: "Welcome documents" };
export const dynamic = "force-dynamic";

export default async function WelcomeDocumentsPage() {
  const documents = await listWelcomeDocuments();
  return <WelcomeListView documents={documents} />;
}
