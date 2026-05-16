import "server-only";

/**
 * Transactional email templates.
 *
 * Single inline-styled HTML per template — Brevo sends MIME multipart
 * with both HTML and a plaintext fallback. Templates are pure
 * functions of a typed input so callers can't accidentally drop a
 * required token.
 *
 * Visual language matches the app: slate text, blue primary CTA,
 * subtle dividers. Inline styles (no <style> tag) survive aggressive
 * email-client renderers like Outlook.
 */

export interface EmailRender {
  subject: string;
  html: string;
  text: string;
}

const COLOR = {
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  primary: "#2563EB",
  primaryText: "#FFFFFF",
};

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

interface BaseEnvelope {
  preheader: string;
  /** Big heading at the top of the body. */
  heading: string;
  /** Body paragraphs, rendered as <p>. */
  paragraphs: string[];
  cta?: { label: string; href: string };
  /** Secondary text rendered after the CTA. */
  secondaryParagraphs?: string[];
  /** "Sent by <business name>" — defaults to the configured sender. */
  signature?: string;
}

function envelope({
  preheader,
  heading,
  paragraphs,
  cta,
  secondaryParagraphs,
  signature,
}: BaseEnvelope): string {
  const cleanPreheader = preheader.replace(/\s+/g, " ").slice(0, 140);
  const ps = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;color:${COLOR.text};font-size:15px;line-height:1.55;">${escapeHtml(p)}</p>`,
    )
    .join("");
  const sps = (secondaryParagraphs ?? [])
    .map(
      (p) =>
        `<p style="margin:0 0 12px;color:${COLOR.muted};font-size:13px;line-height:1.6;">${escapeHtml(p)}</p>`,
    )
    .join("");
  const ctaBlock = cta
    ? `<div style="margin:24px 0;">
        <a href="${escapeAttr(cta.href)}" style="background:${COLOR.primary};color:${COLOR.primaryText};padding:12px 22px;border-radius:6px;font-weight:600;font-size:14px;text-decoration:none;display:inline-block;">${escapeHtml(cta.label)}</a>
       </div>`
    : "";
  const sig = signature
    ? `<p style="margin:18px 0 0;color:${COLOR.muted};font-size:13px;">— ${escapeHtml(signature)}</p>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${COLOR.bg};font-family:${FONT_STACK};">
  <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(cleanPreheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.bg};">
    <tr><td align="center" style="padding:36px 14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid ${COLOR.border};border-radius:10px;">
        <tr><td style="padding:28px 28px 8px;">
          <p style="margin:0 0 18px;color:${COLOR.muted};font-size:12px;letter-spacing:1.5px;text-transform:uppercase;">Stackivo</p>
          <h1 style="margin:0 0 14px;color:${COLOR.text};font-size:22px;line-height:1.3;">${escapeHtml(heading)}</h1>
          ${ps}
          ${ctaBlock}
          ${sps}
          ${sig}
        </td></tr>
      </table>
      <p style="max-width:560px;margin:18px auto 0;color:${COLOR.muted};font-size:11px;line-height:1.5;">
        Sent via Stackivo · You're receiving this because a Stackivo user shared a document with you.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

function plain(
  paragraphs: string[],
  cta?: { label: string; href: string },
  signature?: string,
) {
  const body = paragraphs.join("\n\n");
  const ctaText = cta ? `\n\n${cta.label}: ${cta.href}` : "";
  const signatureText = signature ? `\n\n— ${signature}` : "\n\n— Stackivo";
  return `${body}${ctaText}${signatureText}`;
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

// --- Templates -------------------------------------------------------------

export interface InvoiceSentInput {
  invoiceNumber: string;
  amountFormatted: string;
  dueDate: string;
  clientName: string;
  senderName: string;
  senderEmail?: string;
  message: string | null;
  publicUrl: string;
}

export function renderInvoiceSentEmail(input: InvoiceSentInput): EmailRender {
  const subject = `${input.senderName} sent you invoice ${input.invoiceNumber} — ${input.amountFormatted}`;
  const heading = `Invoice ${input.invoiceNumber}`;
  const paragraphs: string[] = [
    `Hi ${input.clientName},`,
    `${input.senderName} has shared invoice ${input.invoiceNumber} with you for ${input.amountFormatted}, due ${input.dueDate}.`,
  ];
  if (input.message?.trim()) paragraphs.push(input.message.trim());
  return {
    subject,
    html: envelope({
      preheader: `Invoice ${input.invoiceNumber} · ${input.amountFormatted} · due ${input.dueDate}`,
      heading,
      paragraphs,
      cta: { label: "View invoice", href: input.publicUrl },
      secondaryParagraphs: [
        "You can download a PDF copy from the invoice page.",
      ],
      signature: formatSenderSignature(input.senderName, input.senderEmail),
    }),
    text: plain(
      paragraphs,
      { label: "View invoice", href: input.publicUrl },
      formatSenderSignature(input.senderName, input.senderEmail),
    ),
  };
}

export interface InvoiceReminderInput extends InvoiceSentInput {
  daysOverdue: number;
}

export function renderInvoiceReminderEmail(
  input: InvoiceReminderInput,
): EmailRender {
  const overdueLine =
    input.daysOverdue > 0
      ? `This invoice is ${input.daysOverdue} day${input.daysOverdue === 1 ? "" : "s"} overdue.`
      : `This is a friendly reminder — payment is due ${input.dueDate}.`;
  const paragraphs = [
    `Hi ${input.clientName},`,
    overdueLine,
    `Invoice ${input.invoiceNumber} for ${input.amountFormatted} still needs attention.`,
  ];
  if (input.message?.trim()) paragraphs.push(input.message.trim());
  return {
    subject: `Reminder: invoice ${input.invoiceNumber} (${input.amountFormatted})`,
    html: envelope({
      preheader: `Reminder · invoice ${input.invoiceNumber} · ${input.amountFormatted}`,
      heading: `Friendly reminder`,
      paragraphs,
      cta: { label: "View & pay", href: input.publicUrl },
      signature: formatSenderSignature(input.senderName, input.senderEmail),
    }),
    text: plain(
      paragraphs,
      { label: "View & pay", href: input.publicUrl },
      formatSenderSignature(input.senderName, input.senderEmail),
    ),
  };
}

export interface ContractSentInput {
  kindLabel: "Contract" | "Proposal";
  title: string;
  clientName: string;
  senderName: string;
  senderEmail?: string;
  message: string | null;
  publicUrl: string;
}

export function renderContractSentEmail(
  input: ContractSentInput,
): EmailRender {
  const subject = `${input.senderName} sent you a ${input.kindLabel.toLowerCase()}: ${input.title}`;
  const paragraphs = [
    `Hi ${input.clientName},`,
    `${input.senderName} has shared the ${input.kindLabel.toLowerCase()} “${input.title}” with you for review${input.kindLabel === "Contract" ? " and signature" : ""}.`,
  ];
  if (input.message?.trim()) paragraphs.push(input.message.trim());
  return {
    subject,
    html: envelope({
      preheader: `${input.kindLabel} · ${input.title}`,
      heading: input.title,
      paragraphs,
      cta: {
        label: input.kindLabel === "Contract" ? "Review & sign" : "Review proposal",
        href: input.publicUrl,
      },
      signature: formatSenderSignature(input.senderName, input.senderEmail),
    }),
    text: plain(paragraphs, {
      label: input.kindLabel === "Contract" ? "Review & sign" : "Review proposal",
      href: input.publicUrl,
    }, formatSenderSignature(input.senderName, input.senderEmail)),
  };
}

export interface InvoicePaidInput {
  invoiceNumber: string;
  amountFormatted: string;
  clientName: string;
  senderName: string;
  senderEmail?: string;
}

/** Receipt confirmation sent to the client after marking an invoice paid. */
export function renderInvoicePaidEmail(input: InvoicePaidInput): EmailRender {
  const paragraphs = [
    `Hi ${input.clientName},`,
    `Just a quick note to confirm we've received payment of ${input.amountFormatted} for invoice ${input.invoiceNumber}. Thank you!`,
  ];
  return {
    subject: `Payment received — invoice ${input.invoiceNumber}`,
    html: envelope({
      preheader: `Payment received · ${input.amountFormatted}`,
      heading: `Payment received`,
      paragraphs,
      signature: formatSenderSignature(input.senderName, input.senderEmail),
    }),
    text: plain(paragraphs, undefined, formatSenderSignature(input.senderName, input.senderEmail)),
  };
}

export interface WelcomeDocumentSentInput {
  title: string;
  clientName: string;
  senderName: string;
  senderEmail?: string;
  message: string | null;
  publicUrl: string;
  acknowledgementRequired: boolean;
}

/**
 * Sent when a freelancer ships a Welcome Document to a client. The
 * tone is intentionally lighter than `renderContractSentEmail` —
 * "here's how I work" rather than "review and sign".
 */
export function renderWelcomeDocumentEmail(
  input: WelcomeDocumentSentInput,
): EmailRender {
  const subject = `${input.senderName} sent you an onboarding guide: ${input.title}`;
  const paragraphs = [
    `Hi ${input.clientName},`,
    `${input.senderName} has put together a short onboarding guide — “${input.title}” — covering how the engagement will run, communication, response times, and what to expect at each stage.`,
    `It's a 5-minute read and answers most of the questions clients ask along the way. Worth skimming before we kick things off.`,
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
      heading: input.title,
      paragraphs,
      cta: { label: "Read the guide", href: input.publicUrl },
      secondaryParagraphs: secondary,
      signature: formatSenderSignature(input.senderName, input.senderEmail),
    }),
    text: plain(
      paragraphs,
      { label: "Read the guide", href: input.publicUrl },
      formatSenderSignature(input.senderName, input.senderEmail),
    ),
  };
}

export interface PortalInviteInput {
  portalName: string;
  clientName: string | null;
  senderName: string;
  senderEmail?: string;
  acceptUrl: string;
  expiresIso: string;
}

/**
 * Sent when a freelancer invites a new member into a Client Portal.
 * The link is single-use and expires after a week.
 */
export function renderPortalInviteEmail(input: PortalInviteInput): EmailRender {
  const greeting = input.clientName
    ? `Hi ${input.clientName},`
    : "Hello,";
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
    `${input.senderName} has invited you to "${input.portalName}" — your shared workspace for files, contracts, and invoices.`,
    `Click the button below to accept the invitation. The link expires on ${expiryHuman}.`,
  ];
  return {
    subject: `${input.senderName} invited you to ${input.portalName}`,
    html: envelope({
      preheader: `Accept your invitation to ${input.portalName}`,
      heading: `You're invited to ${input.portalName}`,
      paragraphs,
      cta: { label: "Accept invitation", href: input.acceptUrl },
      secondaryParagraphs: [
        "If you don't have a Stackivo account yet, you'll be prompted to create one — it takes about 30 seconds.",
      ],
      signature: formatSenderSignature(input.senderName, input.senderEmail),
    }),
    text: plain(
      paragraphs,
      { label: "Accept invitation", href: input.acceptUrl },
      formatSenderSignature(input.senderName, input.senderEmail),
    ),
  };
}
