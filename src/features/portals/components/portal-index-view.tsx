"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutDashboard, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import {
  AiWorkflowTriggerButton,
  OperationalAiAgentWorkflow,
} from "@/features/ai-workflows/components/operational-ai-agent-workflow";
import type { AiPortalDraft } from "@/features/ai-workflows/types";
import { portalDashboardDetail } from "../routes";
import { CreatePortalButton } from "./create-portal-button";

interface PortalIndexViewProps {
  ownedPortals: Array<{
    id: string;
    name: string;
    status: string;
    client_id: string | null;
    brand_color: string | null;
    updated_at: string;
  }>;
  clients: Array<{
    id: string;
    fullName: string;
    businessName: string | null;
    email: string | null;
  }>;
  activeClientIds: string[];
}

export function PortalIndexView({
  ownedPortals,
  clients,
  activeClientIds,
}: PortalIndexViewProps) {
  const [aiOpen, setAiOpen] = React.useState(false);
  const [aiDraft, setAiDraft] = React.useState<AiPortalDraft | null>(null);

  const clientOptions = React.useMemo(
    () =>
      clients.map((client) => ({
        id: client.id,
        name: client.businessName
          ? `${client.businessName} - ${client.fullName}`
          : client.fullName,
      })),
    [clients],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client portals"
        description="Branded shared workspaces for your clients."
        actions={
          <div className="flex items-center gap-2">
            <AiWorkflowTriggerButton
              active={aiOpen}
              onClick={() => setAiOpen((value) => !value)}
            >
              Generate portal with AI
            </AiWorkflowTriggerButton>
            <CreatePortalButton
              clients={clients}
              activeClientIds={activeClientIds}
              initialAiDraft={aiDraft}
            />
          </div>
        }
      />

      <div
        className={cn(
          "grid items-start gap-6",
          aiOpen ? "xl:grid-cols-[minmax(0,1fr)_420px]" : "grid-cols-1",
        )}
      >
        <div className="min-w-0">
          {ownedPortals.length === 0 ? (
            <EmptyState
              icon={LayoutDashboard}
              title="No portals yet"
              description="Create a portal to share files, contracts, and invoices with a client in one branded space."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ownedPortals.map((portal) => (
                <Link
                  key={portal.id}
                  href={portalDashboardDetail(portal.id)}
                  className="group"
                >
                  <Card className="h-full transition-colors hover:border-primary/40">
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="h-7 w-7 shrink-0 rounded-md"
                          style={{ background: portal.brand_color ?? "#2563EB" }}
                          aria-hidden
                        />
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {portal.status}
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-sm font-semibold leading-snug">
                        {portal.name}
                      </p>
                      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Users className="h-3 w-3" /> Updated{" "}
                        {new Date(portal.updated_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <OperationalAiAgentWorkflow<AiPortalDraft>
          workflow="portal"
          title="Create portal"
          intro="let's create a client portal. I will pick up the client context, draft the portal name and brand setup, then open the portal form for review."
          clients={clientOptions}
          open={aiOpen}
          onOpenChange={setAiOpen}
          applyLabel="Review portal setup"
          onApplyDraft={(draft) => setAiDraft(draft)}
        />
      </div>
    </div>
  );
}
