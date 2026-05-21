import "server-only";

/**
 * Transactional email templates — premium branded layout.
 *
 * Single inline-styled HTML per template — Brevo sends MIME multipart
 * with both HTML and a plaintext fallback. Templates are pure
 * functions of a typed input so callers can't accidentally drop a
 * required token.
 *
 * Design intent: matches the new PDF design system. Brand colour,
 * business name, optional logo, signed footer with contact info. Mobile
 * Outlook-safe (everything is table-based, no flexbox, no `<style>` tag,
 * no class names — only inline styles).
 *
 * The `EmailBrand` shape mirrors the subset of `ResolvedBrand` (in
 * `features/documents/pdf/brand.ts`) that's useful in an HTML email.
 * Templates accept it optionally — when absent we fall back to a clean
 * "Stackivo" envelope so call sites that pre-date the redesign still
 * work unmodified.
 */

// =============================================================================
// Brand shape + tokens
// =============================================================================

export interface EmailBrand {
  businessName: string;
  /** Web URL the email client can render in <img>. Optional. */
  logoUrl: string | null;
  /** `#RRGGBB`. Falls back to the Stackivo primary if absent or invalid. */
  accent: string | null;
  /** Optional contact lines surfaced in the footer. */
  contact?: {
    email?: string | null;
    phone?: string | null;
    website?: string | null;
  };
}

export interface EmailRender {
  subject: string;
  html: string;
  text: string;
}

// Neutral palette — same slate tones we use in the app + PDF.
const COLOR = {
  text: "#0F172A",
  textSoft: "#1E293B",
  muted: "#64748B",
  faint: "#94A3B8",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  primaryDefault: "#2563EB",
  primaryText: "#FFFFFF",
  successBg: "#DCFCE7",
  success: "#15803D",
} as const;

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

// =============================================================================
// Envelope
// =============================================================================

interface EnvelopeInput {
  preheader: string;
  /** Tiny tag rendered above the heading (e.g. "INVOICE", "RECEIPT"). */
  eyebrow?: string;
  /** Big H1 — usually the document or action name. */
  heading: string;
  /** Optional sub-heading rendered as a soft paragraph. */
  subheading?: string;
  /** Body paragraphs rendered as <p>. */
  paragraphs: string[];
  cta?: { label: string; href: string };
  /** Optional facts grid (label / value pairs) rendered as a 2-col card. */
  facts?: { label: string; value: string }[];
  /** Optional secondary "PS" paragraphs rendered after the CTA. */
  secondaryParagraphs?: string[];
  /** Optional success banner shown above the heading (e.g. "PAYMENT RECEIVED"). */
  successBanner?: string;
  /** "Sent by …" line at the foot of the body. */
  signature?: string;
  /** Brand identity — drives accent colour, header, footer contact. */
  brand?: EmailBrand;
}

/**
 * Build the email HTML.
 *
 * Layout (top → bottom):
 *
 *   ─ brand header ─────────────────────────────────────────
 *     {logo} {business name} {right: powered-by-stackivo tag}
 *   ─ optional success banner (green pill)
 *   ─ eyebrow
 *   ─ heading
 *   ─ subheading
 *   ─ paragraphs
 *   ─ facts card (label/value pairs)
 *   ─ CTA button
 *   ─ secondary paragraphs
 *   ─ "—  {sender}" signature line
 *   ─ branded footer with contact + powered-by line
 */
function envelope(input: EnvelopeInput): string {
  const accent = sanitizeColor(input.brand?.accent ?? null) ?? COLOR.primaryDefault;
  const businessName = input.brand?.businessName ?? "Stackivo";
  const logoUrl = input.brand?.logoUrl ?? null;
  const cleanPreheader = input.preheader.replace(/\s+/g, " ").slice(0, 140);

  const eyebrow = input.eyebrow
    ? `<p style="margin:0 0 8px;color:${accent};font-size:11px;letter-spacing:1.8px;text-transform:uppercase;font-weight:700;">${escapeHtml(input.eyebrow)}</p>`
    : "";

  const successBanner = input.successBanner
    ? `<div style="margin:0 0 20px;padding:10px 14px;background:${COLOR.successBg};border-radius:8px;color:${COLOR.success};font-weight:700;font-size:13px;letter-spacing:0.6px;text-transform:uppercase;">${escapeHtml(input.successBanner)}</div>`
    : "";

  const subheading = input.subheading
    ? `<p style="margin:0 0 18px;color:${COLOR.muted};font-size:14px;line-height:1.5;">${escapeHtml(input.subheading)}</p>`
    : "";

  const paragraphs = input.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;color:${COLOR.textSoft};font-size:15px;line-height:1.6;">${escapeHtml(p)}</p>`,
    )
    .join("");

  const facts = input.facts && input.facts.length > 0
    ? buildFactsBlock(input.facts)
    : "";

  const cta = input.cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
        <tr>
          <td bgcolor="${accent}" style="border-radius:8px;">
            <a href="${escapeAttr(input.cta.href)}" target="_blank" rel="noreferrer"
              style="display:inline-block;padding:13px 26px;font-family:${FONT_STACK};font-weight:600;font-size:14px;color:${COLOR.primaryText};text-decoration:none;border-radius:8px;">
              ${escapeHtml(input.cta.label)} &nbsp;→
            </a>
          </td>
        </tr>
      </table>`
    : "";

  const sps = (input.secondaryParagraphs ?? [])
    .map(
      (p) =>
        `<p style="margin:0 0 10px;color:${COLOR.muted};font-size:13px;line-height:1.55;">${escapeHtml(p)}</p>`,
    )
    .join("");

  const sig = input.signature
    ? `<p style="margin:22px 0 0;color:${COLOR.muted};font-size:13px;">— ${escapeHtml(input.signature)}</p>`
    : "";

  const header = buildHeader({ accent, businessName, logoUrl });
  const footer = buildFooter({ brand: input.brand });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(input.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${COLOR.bg};font-family:${FONT_STACK};color:${COLOR.text};">
  <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${escapeHtml(cleanPreheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR.bg};">
    <tr>
      <td align="center" style="padding:32px 14px 36px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
          ${header}
          <tr>
            <td style="background:${COLOR.surface};border:1px solid ${COLOR.border};border-radius:0 0 12px 12px;padding:30px 32px 32px;">
              ${successBanner}
              ${eyebrow}
              <h1 style="margin:0 0 12px;color:${COLOR.text};font-size:24px;line-height:1.25;font-weight:700;letter-spacing:-0.3px;">${escapeHtml(input.heading)}</h1>
              ${subheading}
              ${paragraphs}
              ${facts}
              ${cta}
              ${sps}
              ${sig}
            </td>
          </tr>
          ${footer}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildHeader({
  accent,
  businessName,
  logoUrl,
}: {
  accent: string;
  businessName: string;
  logoUrl: string | null;
}): string {
  const logo = logoUrl
    ? `<img src="${escapeAttr(logoUrl)}" alt="${escapeAttr(businessName)}" width="32" height="32" style="display:block;border-radius:6px;margin-right:10px;border:0;outline:none;" />`
    : `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${accent};margin-right:10px;vertical-align:middle;"></span>`;

  return `<tr>
    <td style="background:${COLOR.surface};border:1px solid ${COLOR.border};border-bottom:none;border-radius:12px 12px 0 0;padding:18px 32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align:middle;">
            ${logo}<span style="display:inline-block;vertical-align:middle;font-weight:700;font-size:15px;color:${COLOR.text};letter-spacing:-0.1px;">${escapeHtml(businessName)}</span>
          </td>
          <td align="right" style="vertical-align:middle;">
            <span style="display:inline-block;height:4px;width:36px;border-radius:999px;background:${accent};"></span>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function buildFooter({ brand }: { brand?: EmailBrand }): string {
  const businessName = brand?.businessName ?? "Stackivo";
  const contactLines: string[] = [];
  if (brand?.contact?.email) contactLines.push(brand.contact.email);
  if (brand?.contact?.phone) contactLines.push(brand.contact.phone);
  if (brand?.contact?.website) contactLines.push(brand.contact.website);

  const contactBlock =
    contactLines.length > 0
      ? `<p style="margin:0 0 6px;color:${COLOR.muted};font-size:12px;line-height:1.55;">${escapeHtml(contactLines.join(" · "))}</p>`
      : "";

  return `<tr>
    <td style="padding:18px 32px 0;">
      ${contactBlock}
      <p style="margin:6px 0 0;color:${COLOR.faint};font-size:11px;line-height:1.5;">
        Sent by ${escapeHtml(businessName)}. Powered by
        <a href="https://stackivo.in" style="color:${COLOR.faint};text-decoration:none;">Stackivo</a>.
      </p>
    </td>
  </tr>`;
}

function buildFactsBlock(facts: { label: string; value: string }[]): string {
  const rows = facts
    .map(
      (f) => `<tr>
        <td style="padding:6px 0;color:${COLOR.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">${escapeHtml(f.label)}</td>
        <td align="right" style="padding:6px 0;color:${COLOR.text};font-size:14px;font-weight:600;">${escapeHtml(f.value)}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px;border:1px solid ${COLOR.border};border-radius:10px;padding:6px 16px;background:${COLOR.bg};">
    ${rows}
  </table>`;
}

function plain(
  paragraphs: string[],
  cta?: { label: string; href: string },
  signature?: string,
  facts?: { label: string; value: string }[],
) {
  const body = paragraphs.join("\n\n");
  const factsText =
    facts && facts.length > 0
      ? `\n\n${facts.map((f) => `${f.label}: ${f.value}`).join("\n")}`
      : "";
  const ctaText = cta ? `\n\n${cta.label}: ${cta.href}` : "";
  const signatureText = signature ? `\n\n— ${signature}` : "\n\n— Stackivo";
  return `${body}${factsText}${ctaText}${signatureText}`;
}

function formatSenderSignature(senderName: string, senderEmail?: string): string {
  return senderEmail ? `${senderName} <${senderEmail}>` : senderName;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

function sanitizeColor(value: string | null): string | null {
  if (!value) return null;
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : null;
}

// =============================================================================
// TEMPLATES
// =============================================================================

// --- Invoice sent ---------------------------------------------------------

export interface InvoiceSentInput {
  invoiceNumber: string;
  amountFormatted: string;
  dueDate: string;
  clientName: string;
  senderName: string;
  senderEmail?: string;
  message: string | null;
  publicUrl: string;
  brand?: EmailBrand;
}

export function renderInvoiceSentEmail(input: InvoiceSentInput): EmailRender {
  const subject = `${input.senderName} sent you invoice ${input.invoiceNumber} — ${input.amountFormatted}`;
  const paragraphs: string[] = [
    `Hi ${input.clientName},`,
    `${input.senderName} has shared a new invoice with you. The full document is attached as a PDF and also available online.`,
  ];
  if (input.message?.trim()) paragraphs.push(input.message.trim());

  const facts = [
    { label: "Invoice", value: input.invoiceNumber },
    { label: "Amount due", value: input.amountFormatted },
    { label: "Due date", value: input.dueDate },
  ];

  return {
    subject,
    html: envelope({
      preheader: `Invoice ${input.invoiceNumber} · ${input.amountFormatted} · due ${input.dueDate}`,
      eyebrow: "Invoice",
      heading: `Invoice ${input.invoiceNumber}`,
      subheading: `${input.amountFormatted} · due ${input.dueDate}`,
      paragraphs,
      facts,
      cta: { label: "View invoice & pay", href: input.publicUrl },
      secondaryParagraphs: [
        "You can pay online securely or download the PDF for your records.",
      ],
      signature: formatSenderSignature(input.senderName, input.senderEmail),
      brand: input.brand,
    }),
    text: plain(
      paragraphs,
      { label: "View invoice", href: input.publicUrl },
      formatSenderSignature(input.senderName, input.senderEmail),
      facts,
    ),
  };
}

// --- Invoice reminder ----------------------------------------------------

export interface InvoiceReminderInput extends InvoiceSentInput {
  daysOverdue: number;
}

export function renderInvoiceReminderEmail(
  input: InvoiceReminderInput,
): EmailRender {
  const isOverdue = input.daysOverdue > 0;
  const overdueLine = isOverdue
    ? `Invoice ${input.invoiceNumber} is ${input.daysOverdue} day${input.daysOverdue === 1 ? "" : "s"} past due. The amount and pay link below are still valid.`
    : `This is a friendly reminder that invoice ${input.invoiceNumber} is due ${input.dueDate}.`;

  const paragraphs = [`Hi ${input.clientName},`, overdueLine];
  if (input.message?.trim()) paragraphs.push(input.message.trim());

  return {
    subject: isOverdue
      ? `Reminder: invoice ${input.invoiceNumber} is overdue (${input.amountFormatted})`
      : `Reminder: invoice ${input.invoiceNumber} (${input.amountFormatted})`,
    html: envelope({
      preheader: `Reminder · invoice ${input.invoiceNumber} · ${input.amountFormatted}`,
      eyebrow: isOverdue ? "Overdue invoice" : "Payment reminder",
      heading: isOverdue ? `Invoice ${input.invoiceNumber} is overdue` : `Friendly reminder`,
      subheading: `${input.amountFormatted} · originally due ${input.dueDate}`,
      paragraphs,
      facts: [
        { label: "Invoice", value: input.invoiceNumber },
        { label: "Amount", value: input.amountFormatted },
        { label: isOverdue ? "Days overdue" : "Due date", value: isOverdue ? String(input.daysOverdue) : input.dueDate },
      ],
      cta: { label: "View & pay", href: input.publicUrl },
      signature: formatSenderSignature(input.senderName, input.senderEmail),
      brand: input.brand,
    }),
    text: plain(
      paragraphs,
      { label: "View & pay", href: input.publicUrl },
      formatSenderSignature(input.senderName, input.senderEmail),
    ),
  };
}

// --- Contract / Proposal sent --------------------------------------------

export interface ContractSentInput {
  kindLabel: "Contract" | "Proposal";
  title: string;
  clientName: string;
  senderName: string;
  senderEmail?: string;
  message: string | null;
  publicUrl: string;
  brand?: EmailBrand;
}

export function renderContractSentEmail(
  input: ContractSentInput,
): EmailRender {
  const subject = `${input.senderName} sent you a ${input.kindLabel.toLowerCase()}: ${input.title}`;
  const paragraphs = [
    `Hi ${input.clientName},`,
    `${input.senderName} has shared the ${input.kindLabel.toLowerCase()} “${input.title}” with you for review${input.kindLabel === "Contract" ? " and signature" : ""}. The full document is attached as a PDF.`,
  ];
  if (input.message?.trim()) paragraphs.push(input.message.trim());
  return {
    subject,
    html: envelope({
      preheader: `${input.kindLabel} · ${input.title}`,
      eyebrow: input.kindLabel,
      heading: input.title,
      paragraphs,
      cta: {
        label: input.kindLabel === "Contract" ? "Review & sign" : "Review proposal",
        href: input.publicUrl,
      },
      secondaryParagraphs: [
        input.kindLabel === "Contract"
          ? "Signing happens entirely online — no printing, no scanning."
          : "Reply to this email with any questions or change requests.",
      ],
      signature: formatSenderSignature(input.senderName, input.senderEmail),
      brand: input.brand,
    }),
    text: plain(
      paragraphs,
      {
        label: input.kindLabel === "Contract" ? "Review & sign" : "Review proposal",
        href: input.publicUrl,
      },
      formatSenderSignature(input.senderName, input.senderEmail),
    ),
  };
}

// --- Invoice paid / Receipt ---------------------------------------------

export interface InvoicePaidInput {
  invoiceNumber: string;
  amountFormatted: string;
  clientName: string;
  senderName: string;
  senderEmail?: string;
  /** When set, surfaces "Receipt RCP-..." as the eyebrow + facts row. */
  receiptNumber?: string;
  /** Pay method label ("UPI", "Stackivo Managed", etc.). */
  paymentMethod?: string;
  /** Pretty-printed paid date for the body. */
  paidAtFormatted?: string;
  /** Reference (Razorpay payment id / UPI UTR). */
  reference?: string;
  /** URL to download the receipt PDF (when generated). */
  receiptUrl?: string;
  brand?: EmailBrand;
}

/** Receipt confirmation sent to the client after a payment is recorded. */
export function renderInvoicePaidEmail(input: InvoicePaidInput): EmailRender {
  const paragraphs = [
    `Hi ${input.clientName},`,
    `Just confirming we've received your payment of ${input.amountFormatted} against invoice ${input.invoiceNumber}. Thank you!`,
  ];
  if (input.receiptNumber) {
    paragraphs.push(
      `Your official receipt — ${input.receiptNumber} — is attached for your records.`,
    );
  }

  const facts: { label: string; value: string }[] = [
    { label: "Amount paid", value: input.amountFormatted },
    { label: "Invoice", value: input.invoiceNumber },
  ];
  if (input.receiptNumber) facts.push({ label: "Receipt", value: input.receiptNumber });
  if (input.paymentMethod) facts.push({ label: "Method", value: input.paymentMethod });
  if (input.paidAtFormatted) facts.push({ label: "Paid on", value: input.paidAtFormatted });
  if (input.reference) facts.push({ label: "Reference", value: input.reference });

  return {
    subject: `Payment received — invoice ${input.invoiceNumber}`,
    html: envelope({
      preheader: `Payment received · ${input.amountFormatted}`,
      successBanner: "Payment received",
      eyebrow: input.receiptNumber ? "Receipt" : "Payment confirmation",
      heading: `Thank you — payment received`,
      subheading: `${input.amountFormatted} settled against invoice ${input.invoiceNumber}`,
      paragraphs,
      facts,
      cta: input.receiptUrl
        ? { label: "Download receipt", href: input.receiptUrl }
        : undefined,
      signature: formatSenderSignature(input.senderName, input.senderEmail),
      brand: input.brand,
    }),
    text: plain(
      paragraphs,
      input.receiptUrl
        ? { label: "Download receipt", href: input.receiptUrl }
        : undefined,
      formatSenderSignature(input.senderName, input.senderEmail),
      facts,
    ),
  };
}

// --- Welcome document ----------------------------------------------------

export interface WelcomeDocumentSentInput {
  title: string;
  clientName: string;
  senderName: string;
  senderEmail?: string;
  message: string | null;
  publicUrl: string;
  acknowledgementRequired: boolean;
  brand?: EmailBrand;
}

export function renderWelcomeDocumentEmail(
  input: WelcomeDocumentSentInput,
): EmailRender {
  const subject = `${input.senderName} sent you an onboarding guide: ${input.title}`;
  const paragraphs = [
    `Hi ${input.clientName},`,
    `${input.senderName} has put together a short onboarding guide — “${input.title}” — covering how the engagement will run, communication, response times, and what to expect at each stage.`,
    `It's a five-minute read and answers most of the questions clients ask along the way. Worth skimming before we kick things off.`,
  ];
  if (input.message?.trim()) paragraphs.push(input.message.trim());
  const secondary = input.acknowledgementRequired
    ? [
        "Once you've read it, please tap “I've read and understood” at the bottom of the page — that's our handshake to get started.",
      ]
    : undefined;
  return {
    subject,
    html: envelope({
      preheader: `Onboarding guide · ${input.title}`,
      eyebrow: "Welcome Guide",
      heading: input.title,
      subheading: "A quick five-minute read",
      paragraphs,
      cta: { label: "Read the guide", href: input.publicUrl },
      secondaryParagraphs: secondary,
      signature: formatSenderSignature(input.senderName, input.senderEmail),
      brand: input.brand,
    }),
    text: plain(
      paragraphs,
      { label: "Read the guide", href: input.publicUrl },
      formatSenderSignature(input.senderName, input.senderEmail),
    ),
  };
}

// --- Portal invite -------------------------------------------------------

export interface PortalInviteInput {
  portalName: string;
  clientName: string | null;
  senderName: string;
  senderEmail?: string;
  acceptUrl: string;
  expiresIso: string;
  brand?: EmailBrand;
}

export function renderPortalInviteEmail(input: PortalInviteInput): EmailRender {
  const greeting = input.clientName ? `Hi ${input.clientName},` : "Hello,";
  const expiry = new Date(input.expiresIso);
  const expiryHuman = isNaN(expiry.getTime())
    ? "soon"
    : expiry.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
  const paragraphs = [
    greeting,
    `${input.senderName} has invited you to ${input.portalName}.`,
    `Use the button below to open the portal and set up access. This invitation expires on ${expiryHuman}.`,
  ];
  return {
    subject: `Invitation to ${input.portalName}`,
    html: envelope({
      preheader: `Open your invitation to ${input.portalName}`,
      eyebrow: "Client Portal",
      heading: `Invitation to ${input.portalName}`,
      subheading: `Expires ${expiryHuman}`,
      paragraphs,
      cta: { label: "Open portal", href: input.acceptUrl },
      secondaryParagraphs: [
        "You will verify the invited email with a one-time code before the portal opens.",
      ],
      signature: formatSenderSignature(input.senderName, input.senderEmail),
      brand: input.brand,
    }),
    text: plain(
      paragraphs,
      { label: "Open portal", href: input.acceptUrl },
      formatSenderSignature(input.senderName, input.senderEmail),
    ),
  };
}

// --- Portal access code --------------------------------------------------

export interface PortalAccessCodeInput {
  code: string;
  portalName?: string | null;
  expiresMinutes: number;
}

export function renderPortalAccessCodeEmail(
  input: PortalAccessCodeInput,
): EmailRender {
  const portalLabel = input.portalName ?? "your client portal";
  const paragraphs = [
    `Use this code to open ${portalLabel}:`,
    input.code,
    `This code expires in ${input.expiresMinutes} minutes. If you did not request it, you can ignore this email.`,
  ];

  return {
    subject: `Your Stackivo portal code is ${input.code}`,
    html: envelope({
      preheader: `Your portal code is ${input.code}`,
      eyebrow: "Client Portal",
      heading: input.code,
      subheading: `Your one-time code for ${portalLabel}`,
      paragraphs: [
        `Use this one-time code to open ${portalLabel}.`,
        `It expires in ${input.expiresMinutes} minutes. If you did not request it, you can ignore this email.`,
      ],
      signature: "Stackivo <connect@stackivo.me>",
    }),
    text: plain(paragraphs, undefined, "Stackivo <connect@stackivo.me>"),
  };
}

// =============================================================================
// Brand resolver helper for senders
// =============================================================================

/**
 * Build an `EmailBrand` from the raw profile columns most senders pull.
 * Callers that already have a `UserProfileRow` should pass the relevant
 * subset; the helper guards against null/empty values.
 */
export function buildEmailBrand(input: {
  businessName?: string | null;
  legalName?: string | null;
  fullName?: string | null;
  brandColor?: string | null;
  logoUrl?: string | null;
  businessEmail?: string | null;
  businessPhone?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
}): EmailBrand {
  return {
    businessName:
      input.businessName ??
      input.legalName ??
      input.fullName ??
      "Stackivo",
    logoUrl: input.logoUrl ?? null,
    accent: input.brandColor ?? null,
    contact: {
      email: input.businessEmail ?? input.email ?? null,
      phone: input.businessPhone ?? input.phone ?? null,
      website: input.website ?? null,
    },
  };
}
