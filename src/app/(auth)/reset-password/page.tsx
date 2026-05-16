import {
  AuthFormFooterLink,
  AuthFormShell,
} from "@/features/auth/components/auth-form-shell";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata = { title: "Set a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthFormShell
      title="Set a new password"
      description="Choose a strong password you haven't used elsewhere."
      footer={
        <AuthFormFooterLink
          prefix="Need a new reset link?"
          href="/forgot-password"
          label="Send again"
        />
      }
    >
      <ResetPasswordForm />
    </AuthFormShell>
  );
}
