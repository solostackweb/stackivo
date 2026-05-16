import { InvoicesListView } from "@/features/invoices/components/invoices-list-view";
import { listInvoices } from "@/features/invoices/server";
import { listClients } from "@/features/clients/server";
import { getClientDisplayName } from "@/features/clients/utils";

export const metadata = { title: "Invoices" };
export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const [invoices, clients] = await Promise.all([
    listInvoices({ limit: 200 }),
    listClients({ limit: 200 }),
  ]);

  return (
    <InvoicesListView
      invoices={invoices}
      clients={clients.map((c) => ({
        id: c.id,
        name: getClientDisplayName(c),
      }))}
    />
  );
}
