"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestPortalCodeAction,
  verifyPortalCodeAction,
  type ActionResult,
} from "@/features/auth/actions";
import {
  AuthFormError,
  AuthFormSuccess,
} from "@/features/auth/components/auth-form-shell";

export function InviteCodeAccess({ email }: { email: string }) {
  const [requestState, requestAction] = useActionState<
    ActionResult<{ email: string }> | undefined,
    FormData
  >(requestPortalCodeAction, undefined);
  const [verifyState, verifyAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(verifyPortalCodeAction, undefined);

  return (
    <div className="space-y-3">
      <form action={requestAction} className="space-y-2">
        <input type="hidden" name="portalEmail" value={email} />
        <AuthFormError
          message={requestState && !requestState.ok ? requestState.error : null}
        />
        <AuthFormSuccess
          message={requestState && requestState.ok ? requestState.message : null}
        />
        <CodeRequestButton />
      </form>

      <form action={verifyAction} className="space-y-2">
        <input type="hidden" name="portalEmail" value={email} />
        <AuthFormError
          message={verifyState && !verifyState.ok ? verifyState.error : null}
        />
        <div className="space-y-1.5">
          <Label htmlFor="invite-portal-code" className="text-xs font-medium">
            Enter code
          </Label>
          <div className="flex gap-2">
            <Input
              id="invite-portal-code"
              name="portalCode"
              inputMode="numeric"
              pattern="[0-9]{6,8}"
              maxLength={8}
              placeholder="Email code"
              required
              className="h-10 tracking-widest"
            />
            <CodeVerifyButton />
          </div>
        </div>
      </form>
    </div>
  );
}

function CodeRequestButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-10 w-full" disabled={pending}>
      {pending ? "Sending code..." : "Email me a one-time code"}
    </Button>
  );
}

function CodeVerifyButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-10 shrink-0" disabled={pending}>
      {pending ? "Opening..." : "Open"}
    </Button>
  );
}
