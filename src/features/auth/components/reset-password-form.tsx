"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction, type ActionResult } from "../actions";
import {
  AuthFormError,
  AuthFormSuccess,
} from "./auth-form-shell";
import { FieldError } from "./field-error";

export function ResetPasswordForm() {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(
    resetPasswordAction,
    undefined,
  );

  const succeeded = state?.ok === true;

  return (
    <form action={formAction} className="space-y-4">
      <AuthFormError message={state && !state.ok ? state.error : null} />
      <AuthFormSuccess message={succeeded ? state?.message ?? null : null} />

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">New password</Label>
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

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Retype your new password"
          required
          disabled={succeeded}
          className="h-11"
        />
        <FieldError
          errors={state && !state.ok ? state.fieldErrors : undefined}
          name="confirmPassword"
        />
      </div>

      <SubmitButton disabled={succeeded} />
    </form>
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
      {pending ? "Updating…" : "Update password"}
    </Button>
  );
}
