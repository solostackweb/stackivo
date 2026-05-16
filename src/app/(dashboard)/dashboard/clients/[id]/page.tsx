import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ClientProfileView } from "@/features/clients/components/client-profile-view";
import {
  getClient,
  getClientInvoiceMetrics,
} from "@/features/clients/server";
import { getClientDisplayName } from "@/features/clients/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const client = await getClient(id);
  return { title: client ? getClientDisplayName(client) : "Client" };
}

export default async function ClientProfilePage({ params }: PageProps) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  const metrics = await getClientInvoiceMetrics(client.id);

  return <ClientProfileView client={client} metrics={metrics} />;
}
