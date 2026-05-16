/**
 * Canonical labels + ordering for the DB `contract_status` and
 * `contract_kind` enums. Dependency-free so server + client can both import.
 */

import type {
  ContractKindRow,
  ContractStatusRow,
} from "@/lib/supabase/types";

export const CONTRACT_STATUSES: ContractStatusRow[] = [
  "draft",
  "sent",
  "viewed",
  "signed",
  "declined",
  "expired",
];

export const CONTRACT_STATUS_LABEL: Record<ContractStatusRow, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  signed: "Signed",
  declined: "Declined",
  expired: "Expired",
};

export const CONTRACT_KINDS: ContractKindRow[] = ["proposal", "contract"];

export const CONTRACT_KIND_LABEL: Record<ContractKindRow, string> = {
  proposal: "Proposal",
  contract: "Contract",
};
