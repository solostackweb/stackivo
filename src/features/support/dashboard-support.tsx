"use client";

/**
 * Dashboard support layer — single mount point for the chat widget +
 * support widget.
 *
 * Mounted from the (server) dashboard layout, fed pre-resolved
 * identity props so the client bundle never has to re-fetch them.
 */

import { CrispProvider, type CrispIdentity } from "./crisp-provider";

interface Props {
  identity: CrispIdentity;
}

export function DashboardSupportLayer({ identity }: Props) {
  return <CrispProvider identity={identity} />;
}
