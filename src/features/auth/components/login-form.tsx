"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type ActionResult } from "../actions";
import {
  AuthFormError,
  AuthOrSeparator,
} from "./auth-form-shell";
import { FieldError } from "./field-error";
import { GoogleOAuthButton } from "./google-oauth-button";

export function LoginForm({
  next,
  oauthError,
}: {
  next?: string;
  oauthError?: string | null;
}) {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(
    loginAction,
    undefined,
  );

  return (
    <div className="space-y-5">
      <GoogleOAuthButton next={next} />
      <AuthOrSeparator />

      <form action={formAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}

        <AuthFormError
          message={
            state && !state.ok
              ? state.error
              : oauthError === "oauth_unavailable"
                ? "Google sign-in isn't configured yet. Use email + password below."
                : null
          }
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Forgot?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            className="h-11"
          />
          <FieldError
            errors={state && !state.ok ? state.fieldErrors : undefined}
            name="password"
          />
        </div>

        <SubmitButton />
      </form>
    </div>
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
      {pending ? "Logging in…" : "Log in"}
    </Button>
  );
}
