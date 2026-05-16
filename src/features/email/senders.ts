import "server-only";

/**
 * Central sender registry for Stackivo transactional email.
 *
 * Keep sender identities in one place so the rest of the app can pick
 * a sender by purpose without duplicating names or email addresses.
 */

export type EmailSenderType =
  | "connect"
  | "support"
  | "billing"
  | "admin"
  | "share";

export interface EmailSenderProfile {
  type: EmailSenderType;
  name: string;
  email: string;
}

export const emailSenders = {
  connect: {
    type: "connect",
    name: "Stackivo Connect",
    email: "connect@stackivo.me",
  },
  support: {
    type: "support",
    name: "Stackivo Support",
    email: "support@stackivo.me",
  },
  billing: {
    type: "billing",
    name: "Stackivo Billing",
    email: "billing@stackivo.me",
  },
  admin: {
    type: "admin",
    name: "Stackivo Admin",
    email: "admin@stackivo.me",
  },
  share: {
    type: "share",
    name: "Stackivo Share",
    email: "share@stackivo.me",
  },
} as const satisfies Record<EmailSenderType, EmailSenderProfile>;

export function isEmailSenderType(value: string): value is EmailSenderType {
  return value in emailSenders;
}

export function getEmailSender(type: EmailSenderType): EmailSenderProfile {
  return emailSenders[type];
}
