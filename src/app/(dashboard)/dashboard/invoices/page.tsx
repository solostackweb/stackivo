import { InvoicesListView } from "@/features/invoices/components/invoices-list-view";
import { listInvoices, nextInvoiceNumber } from "@/features/invoices/server";
import { listClients } from "@/features/clients/server";
import { listProjects } from "@/features/projects/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AUTH_LOGIN_ROUTE } from "@/features/auth/routes";

export const metadata = { title: "Invoices" };
export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(AUTH_LOGIN_ROUTE);

  const [invoices, clients, projects, nextNumber] = await Promise.all([
    listInvoices({ limit: 200 }),
    listClients({ limit: 200 }),
    listProjects({ limit: 200 }),
    nextInvoiceNumber(user.id),
  ]);

  return (
    <InvoicesListView
      invoices={invoices}
      clients={clients}
      projects={projects}
      nextInvoiceNumber={nextNumber.formatted}
    />
  );
}
