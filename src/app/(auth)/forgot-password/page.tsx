import {
  AuthFormFooterLink,
  AuthFormShell,
} from "@/features/auth/components/auth-form-shell";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthFormShell
      title="Reset your password"
      description="We'll email you a secure link to set a new password."
      footer={
        <AuthFormFooterLink
          prefix="Remembered it?"
          href="/login"
          label="Back to log in"
        />
      }
    >
      <ForgotPasswordForm />
    </AuthFormShell>
  );
}
