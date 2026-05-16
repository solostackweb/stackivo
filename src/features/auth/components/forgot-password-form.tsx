"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction, type ActionResult } from "../actions";
import {
  AuthFormError,
  AuthFormSuccess,
} from "./auth-form-shell";
import { FieldError } from "./field-error";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(
    forgotPasswordAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <AuthFormError message={state && !state.ok ? state.error : null} />
      <AuthFormSuccess
        message={state?.ok ? state.message ?? null : null}
      />

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          className="h-11"
        />
        <FieldError
          errors={state && !state.ok ? state.fieldErrors : undefined}
          name="email"
        />
      </div>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="h-11 w-full text-sm font-semibold shadow-lg shadow-primary/20 transition-shadow hover:shadow-xl hover:shadow-primary/25"
      disabled={pending}
    >
      {pending ? "Sending…" : "Send reset link"}
    </Button>
  );
}
