import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireOnboarded } from "@/features/onboarding/server";
import { getCurrentSubscription } from "@/features/subscription/server";
import { DashboardSupportLayer } from "@/features/support/dashboard-support";
import { listClients } from "@/features/clients/server";
import { getClientDisplayName } from "@/features/clients/utils";
import { listProjects } from "@/features/projects/server";

/**
 * Dashboard group layout.
 *
 * Runs `requireOnboarded()` on every dashboard request:
 *   - Unauthenticated → redirected to /login by middleware before we hit RSC.
 *   - Authenticated but mid-onboarding → redirected to the persisted step.
 *   - Authenticated + onboarded → rendered through the dashboard shell.
 *
 * Mounts the support layer (Crisp chat + floating help button) once
 * for the whole authenticated surface; the layer no-ops when neither
 * `NEXT_PUBLIC_CRISP_WEBSITE_ID` nor `NEXT_PUBLIC_ZOHO_DESK_HELP_URL`
 * is set so unconfigured deploys ship without any chat chrome.
 */
export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, subscription, clients, projects] = await Promise.all([
    requireOnboarded(),
    getCurrentSubscription(),
    listClients({ limit: 200 }),
    listProjects({ limit: 200 }),
  ]);

  return (
    <DashboardShell
      profile={profile}
      subscription={subscription}
      aiClients={clients.map((client) => ({
        id: client.id,
        name: getClientDisplayName(client),
      }))}
      aiProjects={projects.map((project) => ({
        id: project.id,
        name: project.name,
        clientId: project.clientId,
      }))}
    >
      {children}
      <DashboardSupportLayer
        identity={{
          email: profile.email,
          nickname: profile.fullName || profile.displayName || null,
          userId: profile.userId,
          plan: subscription?.plan ?? "free",
          mrr: null,
        }}
      />
    </DashboardShell>
  );
}
