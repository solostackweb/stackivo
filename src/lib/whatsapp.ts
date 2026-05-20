/**
 * WhatsApp deep-link utility.
 *
 * Opens `https://wa.me/` links so the user manually hits "Send" inside
 * WhatsApp. No paid APIs, no automated sending, no third-party SDKs.
 *
 * Usage:
 *   shareOnWhatsApp({ phone: client.phone, clientName: "Raj", ... })
 */

export type WaDocumentType = "invoice" | "contract" | "proposal";

export interface WaShareOptions {
  /**
   * Client's phone number in any common format.
   * Normalized to dialable digits via `normalizePhone()`.
   */
  phone?: string | null;
  clientName?: string | null;
  documentType: WaDocumentType;
  /** e.g. "INV-2024-001" — shown bold in the message. */
  documentNumber?: string | null;
  /** Numeric amount — formatted as "INR 1,23,456.00". */
  amount?: number | null;
  currency?: string;
  /** Your business / freelancer name shown at the closing. */
  senderName?: string | null;
  /** Full HTTPS URL — the secure tokenized share link. */
  shareUrl: string;
}

/**
 * Normalizes a raw phone string to a dialable number for wa.me/.
 *
 * Rules (India-first):
 * - 10 digits              → "91" + digits
 * - 12 digits, starts "91" → as-is (already E.164-ish)
 * - 11 digits, starts "0"  → strip "0", prepend "91"
 * - ≥ 10 digits otherwise  → returned as-is
 * - < 10 digits            → null (falls back to generic wa.me/?text=…)
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length >= 10) return digits;
  return null;
}

/**
 * Builds the pre-filled WhatsApp message text.
 */
export function buildWaMessage(opts: WaShareOptions): string {
  const {
    clientName,
    documentType,
    documentNumber,
    amount,
    currency = "INR",
    senderName,
    shareUrl,
  } = opts;

  const greet = clientName ? `Hi ${clientName},` : "Hi,";

  const docLabel =
    documentType === "invoice"
      ? "invoice"
      : documentType === "contract"
        ? "contract"
        : "proposal";

  const docRef = documentNumber ? ` *${documentNumber}*` : "";

  const amountStr =
    amount != null
      ? ` for *${currency} ${amount.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}*`
      : "";

  const closing = senderName ? `\n\nRegards,\n${senderName}` : "";

  return `${greet}\n\nPlease find your ${docLabel}${docRef}${amountStr} here:\n${shareUrl}${closing}`;
}

/**
 * Builds the full `wa.me/` URL with the message pre-filled.
 * If `phone` normalizes to null, returns the generic `wa.me/?text=…` form
 * so the user can pick a recent chat or paste a number.
 */
export function buildWaUrl(opts: WaShareOptions): string {
  const message = buildWaMessage(opts);
  const phone = normalizePhone(opts.phone);
  const encoded = encodeURIComponent(message);
  return phone
    ? `https://wa.me/${phone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

/**
 * Opens the WhatsApp deep link in a new tab.
 * Must be called from a user-gesture handler (click).
 */
export function shareOnWhatsApp(opts: WaShareOptions): void {
  const url = buildWaUrl(opts);
  window.open(url, "_blank", "noopener,noreferrer");
}
