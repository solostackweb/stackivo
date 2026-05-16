import type { PlanId } from "@/features/subscription/types";

export interface MarketingAuthState {
  isAuthenticated: boolean;
  plan: PlanId | null;
  showUpgradeNudge: boolean;
}
