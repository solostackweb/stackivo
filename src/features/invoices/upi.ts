import "server-only";

/**
 * UPI deep-link + QR helpers.
 *
 * The UPI Manual flow renders a QR encoding a `upi://pay?...` URI so the
 * client can pay directly from any UPI app on their phone. Stackivo never
 * sees the payment — the freelancer marks the invoice paid manually once
 * the funds arrive.
 *
 * URI grammar reference (NPCI Bharat QR / UPI):
 *   upi://pay?pa=<vpa>&pn=<payee_name>&am=<amount>&cu=INR&tn=<note>&tr=<ref>
 *
 * - `pa`: payee VPA (e.g. `merchant@hdfcbank`)        — REQUIRED
 * - `pn`: payee name (URL-encoded)                    — REQUIRED
 * - `am`: amount in rupees, with optional 2 decimals  — optional
 * - `cu`: ISO currency (always INR for UPI)           — optional, defaults INR
 * - `tn`: transaction note (URL-encoded, ≤80 chars)   — optional
 * - `tr`: transaction ref id from merchant            — optional
 */

import QRCode from "qrcode";

export interface UpiLinkInput {
  vpa: string;
  payeeName: string;
  amount: number;
  currency?: string;
  note?: string;
  ref?: string;
}

export function buildUpiPayUri(input: UpiLinkInput): string {
  const params = new URLSearchParams();
  params.set("pa", input.vpa);
  params.set("pn", input.payeeName);
  if (Number.isFinite(input.amount) && input.amount > 0) {
    // UPI expects amounts in rupees with up to 2 decimal places.
    params.set("am", input.amount.toFixed(2));
  }
  params.set("cu", input.currency ?? "INR");
  if (input.note) {
    // Truncate to 80 chars per UPI spec.
    params.set("tn", input.note.slice(0, 80));
  }
  if (input.ref) {
    params.set("tr", input.ref.slice(0, 35));
  }
  // URLSearchParams uses `+` for spaces in URL form encoding; UPI apps
  // accept both `+` and `%20`. We leave it as-is.
  return `upi://pay?${params.toString()}`;
}

/**
 * Render the UPI URI as an inline SVG QR code (string) for safe
 * embedding via `dangerouslySetInnerHTML`. ECC level M balances size and
 * readability; UPI VPA URIs typically fit in ~150 bytes.
 */
export async function renderUpiQrSvg(input: UpiLinkInput): Promise<{
  svg: string;
  uri: string;
}> {
  const uri = buildUpiPayUri(input);
  const svg = await QRCode.toString(uri, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: {
      // QR colours must contrast — leave dark on transparent so the
      // surrounding card colour shows through.
      dark: "#0f172a",
      light: "#ffffff",
    },
    width: 240,
  });
  return { svg, uri };
}
