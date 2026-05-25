import { FileSignature } from "lucide-react";
import { ContractsListView } from "@/features/contracts/components/contracts-list-view";
import { listContracts } from "@/features/contracts/server";
import { listClients } from "@/features/clients/server";
import { getClientDisplayName } from "@/features/clients/utils";
import { canUseFeature } from "@/features/subscription/server";
import { PageHeader } from "@/components/shared/page-header";
import { UpgradeWall } from "@/components/shared/upgrade-wall";

export const metadata = { title: "Contracts" };
export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const allowed = await canUseFeature("contracts.e_signature");

  if (!allowed) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Contracts"
          description="Send, sign, and track client agreements."
        />
        <UpgradeWall
          icon={FileSignature}
          feature="Contracts"
          title="Contracts are a Pro feature"
          description="Send professional contracts, get them signed electronically, and track their status — all without leaving Stackivo."
          benefits={[
            "Create contracts from templates or scratch",
            "Send for e-signature directly from your dashboard",
            "Clients sign in seconds — no account required",
            "Auto-archive signed copies for your records",
          ]}
          requiredPlan="Pro"
        />
      </div>
    );
  }

  const [contracts, clients] = await Promise.all([
    listContracts({ limit: 200 }),
    listClients({ limit: 200 }),
  ]);
  return (
    <ContractsListView
      contracts={contracts}
      clients={clients.map((c) => ({
        id: c.id,
        name: getClientDisplayName(c),
        email: c.email,
      }))}
    />
  );
}
