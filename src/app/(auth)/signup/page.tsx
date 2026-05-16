import { redirect } from "next/navigation";
import {
  AuthFormFooterLink,
  AuthFormShell,
} from "@/features/auth/components/auth-form-shell";
import { SignupForm } from "@/features/auth/components/signup-form";
import { getCurrentUser } from "@/features/auth/server";
import { AUTH_DEFAULT_REDIRECT } from "@/features/auth/routes";

export const metadata = { title: "Sign up" };

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect(AUTH_DEFAULT_REDIRECT);

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
      <SignupForm />
    </AuthFormShell>
  );
}
