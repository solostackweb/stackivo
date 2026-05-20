import { redirect } from "next/navigation";
import {
  AuthFormFooterLink,
  AuthFormShell,
} from "@/features/auth/components/auth-form-shell";
import { SignupForm } from "@/features/auth/components/signup-form";
import { getCurrentUser } from "@/features/auth/server";
import { AUTH_DEFAULT_REDIRECT } from "@/features/auth/routes";

export const metadata = { title: "Sign up" };

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function SignupPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (user) redirect(AUTH_DEFAULT_REDIRECT);

  const { error: oauthError } = await searchParams;

  return (
    <AuthFormShell
      title="Create your workspace"
      description="Start managing your freelance business in minutes."
      footer={
        <AuthFormFooterLink
          prefix="Already have an account?"
          href="/login"
          label="Log in"
        />
      }
    >
      <SignupForm oauthError={oauthError ?? null} />
    </AuthFormShell>
  );
}
