/**
 * Public barrel for the billing feature.
 *
 * Type-only re-exports plus pure helpers. Server-only modules
 * (`./server`, `./webhook`, `./razorpay/*`) must be imported from their
 * full paths so they never leak into the client bundle.
 */

export type {
  BillingCycle,
  BillingLifecycle,
  BillingPayment,
  BillingSubscription,
  CheckoutSession,
  StartCheckoutInput,
} from "./types";
export { mapPaymentRow } from "./types";
export { deriveLifecycle, entitledPlan, mapRazorpayStatus } from "./state";
