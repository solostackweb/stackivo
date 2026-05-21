import { redirect } from "next/navigation";
import {
  AuthFormFooterLink,
  AuthFormShell,
} from "@/features/auth/components/auth-form-shell";
import { SignupForm } from "@/features/auth/components/signup-form";
import { getCurrentUser } from "@/features/auth/server";
import {
  AUTH_DEFAULT_REDIRECT,
  isClientPortalPath,
} from "@/features/auth/routes";

export const metadata = { title: "Sign up" };

interface PageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function SignupPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const sp = await searchParams;
  const next =
    sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//")
      ? sp.next
      : undefined;
  if (user) redirect(next ?? AUTH_DEFAULT_REDIRECT);

  return (
    <AuthFormShell
      title={next && isClientPortalPath(next) ? "Create portal access" : "Create your workspace"}
      description={
        next && isClientPortalPath(next)
          ? "Use the invited email address to open your client portal."
          : "Start managing your freelance business in minutes."
      }
      footer={
        <AuthFormFooterLink
          prefix="Already have an account?"
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          label="Log in"
        />
      }
    >
      <SignupForm oauthError={sp.error ?? null} next={next} />
    </AuthFormShell>
  );
}
