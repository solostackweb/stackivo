"use client";

/**
 * Dashboard support layer — single mount point for the chat widget +
 * floating support button.
 *
 * Mounted from the (server) dashboard layout, fed pre-resolved
 * identity props so the client bundle never has to re-fetch them.
 */

import * as React from "react";
import { CrispProvider, type CrispIdentity } from "./crisp-provider";
import { SupportButton } from "./support-button";

interface Props {
  identity: CrispIdentity;
}

export function DashboardSupportLayer({ identity }: Props) {
  return (
    <>
      <CrispProvider identity={identity} />
      <SupportButton />
    </>
  );
}
