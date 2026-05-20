import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Shared layout shell for auth form pages.
 *
 * Keeps titles, descriptions, and secondary CTAs visually consistent across
 * login / signup / forgot-password / reset-password.
 */
export function AuthFormShell({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-7", className)}>
      <div className="space-y-2 text-left">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
      {footer ? (
        <div className="text-left text-sm text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function AuthFormFooterLink({
  prefix,
  href,
  label,
}: {
  prefix: string;
  href: string;
  label: string;
}) {
  return (
    <>
      {prefix}{" "}
      <Link
        href={href}
        className="font-medium text-foreground hover:underline"
      >
        {label}
      </Link>
    </>
  );
}

/**
 * Inline form-level error — renders nothing when `message` is falsy so
 * callers can pass the server-action error directly.
 */
export function AuthFormError({ message }: { message?: string | null }) {
  const safeMessage =
    typeof message === "string" && message.trim() !== "{}" && message.trim() !== "[]"
      ? message
      : null;
  if (!safeMessage) return null;
  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      {safeMessage}
    </div>
  );
}

/**
 * Inline form-level success message.
 */
export function AuthFormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm text-success"
    >
      {message}
    </div>
  );
}

/**
 * Visual "or" separator between OAuth and email/password flows.
 */
export function AuthOrSeparator() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
        <span className="bg-card px-2 text-muted-foreground">
          or continue with email
        </span>
      </div>
    </div>
  );
}
