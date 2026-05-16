/**
 * Shared global declaration for the Razorpay Checkout JS SDK loaded via
 * `<Script src="https://checkout.razorpay.com/v1/checkout.js" />`.
 */

export {};

declare global {
  interface RazorpayCheckoutOptions {
    key: string;
    /** Subscription checkouts only. */
    subscription_id?: string;
    /** Order-based (one-off) checkouts only. */
    order_id?: string;
    /** Order checkouts: amount in the smallest currency unit (paise). */
    amount?: number;
    currency?: string;
    name: string;
    description?: string;
    prefill?: { name?: string; email?: string; contact?: string };
    notes?: Record<string, string>;
    theme?: { color?: string };
    handler?: (resp: {
      razorpay_payment_id?: string;
      razorpay_subscription_id?: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
    }) => void | Promise<void>;
    modal?: { ondismiss?: () => void };
  }

  interface RazorpayInstance {
    open(): void;
    on(event: string, handler: (payload: unknown) => void): void;
  }

  interface Window {
    Razorpay?: new (opts: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}
