import Link from "next/link";
import {
  AuthFormShell,
  AuthFormFooterLink,
} from "@/features/auth/components/auth-form-shell";
import { PortalAccessForm } from "@/features/auth/components/portal-access-form";

export const metadata = { title: "Client portal access" };

/**
 * /portal-access — a clean, dedicated page for clients to enter their portal
 * via a one-time email code. Completely separate from the freelancer login flow
 * so neither user group is confused by the other's interface.
 */
export default function PortalAccessPage() {
  return (
    <AuthFormShell
      title="Access your client portal"
      description="Enter your email and we'll send you a one-time code to open your workspace."
      footer={
        <>
          <AuthFormFooterLink
            prefix="Are you a freelancer?"
            href="/login"
            label="Log in to your workspace"
          />
        </>
      }
    >
      <PortalAccessForm />
    </AuthFormShell>
  );
}
