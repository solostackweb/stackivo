/**
 * Public barrel for the subscription feature.
 *
 * Only re-exports TYPES and PURE helpers — the server-only modules
 * (`./server.ts`, `./usage.ts`) must be imported from their full paths so
 * they are never pulled into a client bundle.
 */

export * from "./types";
export {
  PLAN_ORDER,
  PLANS,
  comparePlans,
  getPlan,
  listPlans,
  minimumPlanFor,
  minimumPlanForLimit,
} from "./plans";
export {
  effectivePlan,
  hasFeature,
  hasModule,
  limitFor,
  toUsageSnapshot,
  withinLimit,
} from "./features";
export { useSubscription } from "./hooks/use-subscription";
export { FeatureGate } from "./components/feature-gate";
