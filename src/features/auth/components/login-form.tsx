"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  loginAction,
  requestPortalCodeAction,
  verifyPortalCodeAction,
  type ActionResult,
} from "../actions";
import {
  AuthFormError,
  AuthFormSuccess,
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
  const [portalEmail, setPortalEmail] = React.useState("");
  const [requestState, requestCodeAction] = useActionState<
    ActionResult<{ email: string }> | undefined,
    FormData
  >(requestPortalCodeAction, undefined);
  const [verifyState, verifyCodeAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(verifyPortalCodeAction, undefined);

  React.useEffect(() => {
    if (requestState?.ok && requestState.data?.email) {
      setPortalEmail(requestState.data.email);
    }
  }, [requestState]);

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <GoogleOAuthButton next={next} />
        <AuthOrSeparator />

        <form action={formAction} className="space-y-4">
          {next && <input type="hidden" name="next" value={next} />}

          <AuthFormError
            message={
              state && !state.ok
                ? state.error
                : oauthError
                  ? resolveOAuthError(oauthError)
                  : null
            }
          />

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
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
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
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
              placeholder="Password"
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

      <div className="space-y-3 rounded-lg border bg-muted/25 p-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Client portal access</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Invited as a client? Get a one-time code and open your portal.
          </p>
        </div>

        <form action={requestCodeAction} className="space-y-3">
          <AuthFormError
            message={requestState && !requestState.ok ? requestState.error : null}
          />
          <AuthFormSuccess
            message={requestState && requestState.ok ? requestState.message : null}
          />
          <div className="space-y-2">
            <Label htmlFor="portal-email" className="text-xs font-medium">
              Client email
            </Label>
            <div className="flex gap-2">
              <Input
                id="portal-email"
                name="portalEmail"
                type="email"
                autoComplete="email"
                placeholder="client@example.com"
                value={portalEmail}
                onChange={(event) => setPortalEmail(event.target.value)}
                required
                className="h-10"
              />
              <PortalCodeRequestButton />
            </div>
          </div>
        </form>

        <form action={verifyCodeAction} className="space-y-3">
          <input type="hidden" name="portalEmail" value={portalEmail} />
          <AuthFormError
            message={verifyState && !verifyState.ok ? verifyState.error : null}
          />
          <div className="flex gap-2">
            <Input
              name="portalCode"
              inputMode="numeric"
              pattern="[0-9]{6,8}"
              maxLength={8}
              placeholder="Email code"
              required
              className="h-10 tracking-widest"
            />
            <PortalCodeVerifyButton disabled={!portalEmail} />
          </div>
        </form>
      </div>
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
      {pending ? "Logging in..." : "Log in"}
    </Button>
  );
}

function PortalCodeRequestButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      className="h-10 shrink-0"
      disabled={pending}
    >
      {pending ? "Sending" : "Send code"}
    </Button>
  );
}

function PortalCodeVerifyButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="h-10 shrink-0"
      disabled={pending || disabled}
    >
      {pending ? "Checking" : "Open"}
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
        return "Google sign-in is misconfigured. Contact support.";
      }
      if (decoded.toLowerCase().includes("access_denied")) {
        return "Google sign-in was denied. Please try again or use email + password.";
      }
      return "Google sign-in failed. Please try again or use email + password below.";
    }
  }
}
