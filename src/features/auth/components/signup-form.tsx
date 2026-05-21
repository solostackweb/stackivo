"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupAction, type ActionResult } from "../actions";
import {
  AuthFormError,
  AuthFormSuccess,
  AuthOrSeparator,
} from "./auth-form-shell";
import { FieldError } from "./field-error";
import { GoogleOAuthButton } from "./google-oauth-button";

export function SignupForm({
  oauthError,
  next,
}: {
  oauthError?: string | null;
  next?: string;
}) {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(
    signupAction,
    undefined,
  );

  const succeeded = state?.ok === true;

  // Resolve OAuth error code to a user-friendly message.
  const oauthErrorMessage = oauthError
    ? resolveOAuthError(oauthError)
    : null;

  return (
    <div className="space-y-5">
      {oauthErrorMessage && !state ? (
        <AuthFormError message={oauthErrorMessage} />
      ) : null}
      <GoogleOAuthButton from="signup" next={next} />
      <AuthOrSeparator />

      <form action={formAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <AuthFormError message={state && !state.ok ? state.error : null} />
        <AuthFormSuccess message={succeeded ? state?.message ?? null : null} />

        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-sm font-medium">Full name</Label>
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            placeholder="Jane Doe"
            required
            disabled={succeeded}
            className="h-11"
          />
          <FieldError
            errors={state && !state.ok ? state.fieldErrors : undefined}
            name="fullName"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            disabled={succeeded}
            className="h-11"
          />
          <FieldError
            errors={state && !state.ok ? state.fieldErrors : undefined}
            name="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            required
            disabled={succeeded}
            className="h-11"
          />
          <FieldError
            errors={state && !state.ok ? state.fieldErrors : undefined}
            name="password"
          />
        </div>

        <SubmitButton disabled={succeeded} />
      </form>
    </div>
  );
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="h-11 w-full text-sm font-semibold shadow-lg shadow-primary/20 transition-shadow hover:shadow-xl hover:shadow-primary/25"
      disabled={disabled || pending}
    >
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}

function resolveOAuthError(code: string): string {
  switch (code) {
    case "oauth_unavailable":
      return "Google sign-in isn't configured yet. Use email + password below.";
    case "missing_code":
      return "Google sign-in was cancelled or timed out. Please try again.";
    default: {
      const decoded = decodeURIComponent(code);
      if (decoded.toLowerCase().includes("redirect_uri_mismatch")) {
        return "Google sign-in is misconfigured — the redirect URI is not authorised. Contact support.";
      }
      if (decoded.toLowerCase().includes("access_denied")) {
        return "Google sign-in was denied. Please try again or use email + password.";
      }
      return "Google sign-in failed. Please try again or use email + password below.";
    }
  }
}
