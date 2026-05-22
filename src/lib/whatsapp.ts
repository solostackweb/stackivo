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

// =============================================================================
// Portal-specific WhatsApp share builders
// =============================================================================

export interface WaPortalUpdateOptions {
  phone?: string | null;
  clientName?: string | null;
  senderName?: string | null;
  portalName: string;
  updateTitle: string;
  updateType: string;
  portalUrl: string;
}

export interface WaPortalMeetingOptions {
  phone?: string | null;
  clientName?: string | null;
  senderName?: string | null;
  portalName: string;
  topic: string;
  proposedTime?: string | null;
  meetLink?: string | null;
  portalUrl: string;
}

export interface WaPortalDeliverableOptions {
  phone?: string | null;
  clientName?: string | null;
  senderName?: string | null;
  portalName: string;
  deliverableTitle: string;
  portalUrl: string;
}

export interface WaPortalInvoiceOptions {
  phone?: string | null;
  clientName?: string | null;
  senderName?: string | null;
  portalName: string;
  invoiceNumber?: string | null;
  amount?: number | null;
  currency?: string;
  portalUrl: string;
}

/**
 * Builds a pre-filled WhatsApp message for a portal update notification.
 */
export function buildPortalUpdateWaMessage(opts: WaPortalUpdateOptions): string {
  const { clientName, senderName, portalName, updateTitle, updateType, portalUrl } = opts;
  const greet = clientName ? `Hi ${clientName},` : "Hi,";
  const typeLabel = updateType === "deliverable" ? "deliverable" : "update";
  const closing = senderName ? `\n\nRegards,\n${senderName}` : "";
  return `${greet}\n\nI've posted a new *${typeLabel}* in your portal *${portalName}*:\n\n📌 *${updateTitle}*\n\nView it here: ${portalUrl}${closing}`;
}

/**
 * Builds a pre-filled WhatsApp message for a meeting request or confirmation.
 */
export function buildPortalMeetingWaMessage(opts: WaPortalMeetingOptions): string {
  const { clientName, senderName, portalName, topic, proposedTime, meetLink, portalUrl } = opts;
  const greet = clientName ? `Hi ${clientName},` : "Hi,";
  const timeLine = proposedTime ? `\n📅 *When:* ${proposedTime}` : "";
  const linkLine = meetLink ? `\n🔗 *Join:* ${meetLink}` : "";
  const closing = senderName ? `\n\nRegards,\n${senderName}` : "";
  return `${greet}\n\nA meeting has been scheduled in your portal *${portalName}*:\n\n📋 *Topic:* ${topic}${timeLine}${linkLine}\n\nView details: ${portalUrl}${closing}`;
}

/**
 * Builds a pre-filled WhatsApp message to share a deliverable for review.
 */
export function buildPortalDeliverableWaMessage(opts: WaPortalDeliverableOptions): string {
  const { clientName, senderName, portalName, deliverableTitle, portalUrl } = opts;
  const greet = clientName ? `Hi ${clientName},` : "Hi,";
  const closing = senderName ? `\n\nRegards,\n${senderName}` : "";
  return `${greet}\n\nYour deliverable is ready for review in *${portalName}*:\n\n✅ *${deliverableTitle}*\n\nPlease take a look and let me know your feedback: ${portalUrl}${closing}`;
}

/**
 * Builds a pre-filled WhatsApp message for a portal invoice share.
 */
export function buildPortalInvoiceWaMessage(opts: WaPortalInvoiceOptions): string {
  const { clientName, senderName, portalName, invoiceNumber, amount, currency = "INR", portalUrl } = opts;
  const greet = clientName ? `Hi ${clientName},` : "Hi,";
  const refLine = invoiceNumber ? ` *${invoiceNumber}*` : "";
  const amountLine = amount != null
    ? ` for *${currency} ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*`
    : "";
  const closing = senderName ? `\n\nRegards,\n${senderName}` : "";
  return `${greet}\n\nYour invoice${refLine}${amountLine} is available in *${portalName}*:\n\n${portalUrl}${closing}`;
}

/**
 * Builds and opens a portal update share link on WhatsApp.
 */
export function sharePortalUpdateOnWhatsApp(opts: WaPortalUpdateOptions): void {
  const message = buildPortalUpdateWaMessage(opts);
  const phone = normalizePhone(opts.phone);
  const encoded = encodeURIComponent(message);
  const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Builds and opens a portal meeting share link on WhatsApp.
 */
export function sharePortalMeetingOnWhatsApp(opts: WaPortalMeetingOptions): void {
  const message = buildPortalMeetingWaMessage(opts);
  const phone = normalizePhone(opts.phone);
  const encoded = encodeURIComponent(message);
  const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

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
