import "server-only";

/**
 * Brevo transport adapters.
 *
 * The service layer resolves a sender profile and then uses one of
 * these adapters. The API adapter keeps the current transactional API
 * path working; the SMTP adapter lets the app switch to Brevo relay
 * without changing callers.
 */

import { Buffer } from "node:buffer";
import nodemailer from "nodemailer";
import { requireServerEnv } from "@/config/env";
import type { EmailSenderProfile } from "./senders";

const BREVO_BASE_URL = "https://api.brevo.com/v3";

export class EmailTransportError extends Error {
  status: number;
  provider: "brevo-api" | "brevo-smtp";
  retryable: boolean;
  body: unknown;

  constructor(
    message: string,
    status: number,
    body: unknown,
    provider: "brevo-api" | "brevo-smtp",
    retryable = false,
  ) {
    super(message);
    this.name = "EmailTransportError";
    this.status = status;
    this.provider = provider;
    this.retryable = retryable;
    this.body = body;
  }
}

export class BrevoError extends EmailTransportError {
  constructor(
    message: string,
    status: number,
    body: unknown,
    retryable = false,
  ) {
    super(message, status, body, "brevo-api", retryable);
    this.name = "BrevoError";
  }
}

export interface BrevoAttachment {
  /** File name shown in the email. */
  name: string;
  /** Raw bytes — converted to base64 before sending. */
  content: Buffer;
}

export interface BrevoSendInput {
  sender?: EmailSenderProfile;
  to: { email: string; name?: string };
  /** Optional reply-to override (default: configured sender). */
  replyTo?: { email: string; name?: string };
  /** Cc the freelancer if they want a copy. */
  cc?: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachments?: BrevoAttachment[];
  /** Free-form metadata returned to webhooks via `tags`. */
  tags?: string[];
  /** Per-message headers — e.g. `{ "X-Mailin-Custom": invoiceId }`. */
  headers?: Record<string, string>;
}

export interface BrevoSendResult {
  /** Brevo's `messageId`, used to correlate webhook events. */
  messageId: string;
}

/**
 * Configuration accessor — surfaced separately so the send service can
 * detect "email not configured" early and short-circuit gracefully.
 */
export function getBrevoConfig(): {
  transport: "api" | "smtp";
  apiKey: string | null;
  apiConfigured: boolean;
  senderEmail: string | null;
  senderName: string;
  smtpConfigured: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpPassword: string | null;
} {
  const env = requireServerEnv();
  return {
    transport: env.brevoTransport,
    apiKey: env.brevoApiKey ?? null,
    apiConfigured: Boolean(env.brevoApiKey),
    senderEmail: env.brevoSenderEmail ?? null,
    senderName: env.brevoSenderName,
    smtpConfigured: Boolean(env.brevoSmtpUser && env.brevoSmtpPassword),
    smtpHost: env.brevoSmtpHost,
    smtpPort: env.brevoSmtpPort,
    smtpSecure: env.brevoSmtpSecure,
    smtpUser: env.brevoSmtpUser ?? null,
    smtpPassword: env.brevoSmtpPassword ?? null,
  };
}

export function isEmailConfigured(): boolean {
  const cfg = getBrevoConfig();
  return cfg.apiConfigured || cfg.smtpConfigured;
}

export async function sendBrevoEmail(
  input: BrevoSendInput,
): Promise<BrevoSendResult> {
  const cfg = getBrevoConfig();
  if (!cfg.apiConfigured || !cfg.apiKey) {
    throw new BrevoError(
      "Brevo API is not configured (set BREVO_API_KEY).",
      500,
      null,
      true,
    );
  }

  const sender =
    input.sender ??
    (cfg.senderEmail ? { name: cfg.senderName, email: cfg.senderEmail } : null);
  if (!sender) {
    throw new BrevoError(
      "Brevo sender is not configured (set BREVO_SENDER_EMAIL or pass a sender profile).",
      500,
      null,
      false,
    );
  }

  let res: Response;
  try {
    res = await fetch(`${BREVO_BASE_URL}/smtp/email`, {
      method: "POST",
      headers: {
        "api-key": cfg.apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: sender.email, name: sender.name },
        to: [input.to],
        cc: input.cc,
        replyTo: input.replyTo,
        subject: input.subject,
        htmlContent: input.htmlContent,
        textContent: input.textContent,
        tags: input.tags,
        headers: input.headers,
        attachment: input.attachments?.map((a) => ({
          name: a.name,
          content: a.content.toString("base64"),
        })),
      }),
      cache: "no-store",
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown API error.");
    throw new EmailTransportError(err.message, 500, error, "brevo-api", true);
  }

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    const candidate =
      json && typeof json === "object" && "message" in json
        ? (json as { message?: unknown }).message
        : null;
    const message =
      typeof candidate === "string" && candidate.length > 0
        ? candidate
        : `Brevo ${res.status}`;
    throw new BrevoError(message, res.status, json, res.status >= 500);
  }

  const idCandidate =
    json && typeof json === "object" && "messageId" in json
      ? (json as { messageId?: unknown }).messageId
      : null;
  const messageId =
    typeof idCandidate === "string" && idCandidate.length > 0 ? idCandidate : "";

  return { messageId };
}

export async function sendBrevoSmtpEmail(
  input: BrevoSendInput,
): Promise<BrevoSendResult> {
  const cfg = getBrevoConfig();
  if (!cfg.smtpConfigured || !cfg.smtpUser || !cfg.smtpPassword) {
    throw new EmailTransportError(
      "Brevo SMTP is not configured (set BREVO_SMTP_USER and BREVO_SMTP_PASSWORD).",
      500,
      null,
      "brevo-smtp",
      false,
    );
  }

  const sender = input.sender ?? {
    name: cfg.senderName,
    email: cfg.senderEmail ?? cfg.smtpUser,
  };

  const transporter = nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    secure: cfg.smtpSecure,
    auth: {
      user: cfg.smtpUser,
      pass: cfg.smtpPassword,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: { name: sender.name, address: sender.email },
      to: formatRecipient(input.to),
      cc: input.cc?.map(formatRecipient),
      replyTo: input.replyTo ? formatRecipient(input.replyTo) : undefined,
      subject: input.subject,
      html: input.htmlContent,
      text: input.textContent,
      headers: input.headers,
      attachments: input.attachments?.map((attachment) => ({
        filename: attachment.name,
        content: attachment.content,
      })),
    });

    return {
      messageId: typeof info.messageId === "string" ? info.messageId : "",
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown SMTP error.");
    throw new EmailTransportError(err.message, 500, error, "brevo-smtp", true);
  }
}

function formatRecipient(recipient: { email: string; name?: string }): string {
  return recipient.name ? `${recipient.name} <${recipient.email}>` : recipient.email;
}