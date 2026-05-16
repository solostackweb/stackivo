import { notFound } from "next/navigation";
import { getContract } from "@/features/contracts/server";
import { getClient } from "@/features/clients/server";
import { getClientDisplayName } from "@/features/clients/utils";
import { ContractDetailView } from "@/features/contracts/components/contract-detail-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const contract = await getContract(id);
  return { title: contract ? contract.title : "Contract" };
}

export default async function ContractDetailPage({ params }: PageProps) {
  const { id } = await params;
  const contract = await getContract(id);
  if (!contract) notFound();
  const client = contract.clientId ? await getClient(contract.clientId) : null;
  return (
    <ContractDetailView
      contract={contract}
      client={client}
      clientName={client ? getClientDisplayName(client) : null}
    />
  );
}
