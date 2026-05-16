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

export function SignupForm() {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(
    signupAction,
    undefined,
  );

  const succeeded = state?.ok === true;

  return (
    <div className="space-y-5">
      <GoogleOAuthButton />
      <AuthOrSeparator />

      <form action={formAction} className="space-y-4">
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
