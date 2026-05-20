"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { googleOAuthAction } from "../actions";

/**
 * Placeholder Google OAuth button.
 *
 * Wires up a `form` + server action so the flow will "just work" the moment
 * Google is enabled in Supabase → Authentication → Providers.
 *
 * If OAuth is not configured, the server action redirects back to
 * `/login?error=oauth_unavailable`, which the login page can surface.
 */
export function GoogleOAuthButton({
  next,
  from = "login",
  label = "Continue with Google",
}: {
  next?: string;
  /** Which auth page is rendering this button. Used to redirect errors back correctly. */
  from?: "login" | "signup";
  label?: string;
}) {
  return (
    <form action={googleOAuthAction} className="w-full">
      {next && <input type="hidden" name="next" value={next} />}
      <input type="hidden" name="from" value={from} />
      <SubmitButton label={label} />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      className="h-11 w-full text-sm font-medium"
      disabled={pending}
    >
      <GoogleGlyph />
      {pending ? "Redirecting…" : label}
    </Button>
  );
}

function GoogleGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1a6.2 6.2 0 1 1 0-12.4c1.95 0 3.26.83 4 1.55l2.73-2.63C17 3.1 14.77 2 12 2 6.98 2 2.94 6.02 2.94 11.05S6.98 20.1 12 20.1c6.93 0 9.18-4.86 9.18-7.35 0-.5-.05-.88-.13-1.24z"
      />
      <path
        fill="#4285F4"
        d="M21.18 12.75a9.6 9.6 0 0 0-.13-1.55H12v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1a6.19 6.19 0 0 1-5.85-4.14L2.4 17.9A10.11 10.11 0 0 0 12 22c5.52 0 9.18-3.86 9.18-9.25z"
      />
    </svg>
  );
}
