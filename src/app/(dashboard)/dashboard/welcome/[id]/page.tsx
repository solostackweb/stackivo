import { notFound } from "next/navigation";
import { getWelcomeDocument } from "@/features/welcome-documents/server";
import { listClients } from "@/features/clients/server";
import { getClientDisplayName } from "@/features/clients/utils";
import { WelcomeDetailView } from "@/features/welcome-documents/components/welcome-detail-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const doc = await getWelcomeDocument(id);
  return { title: doc ? doc.title : "Welcome document" };
}

export default async function WelcomeDocumentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [doc, clients] = await Promise.all([
    getWelcomeDocument(id),
    listClients({ limit: 200 }),
  ]);
  if (!doc) notFound();
  return (
    <WelcomeDetailView
      doc={doc}
      clients={clients.map((c) => ({
        id: c.id,
        name: getClientDisplayName(c),
        email: c.email,
      }))}
    />
  );
}
