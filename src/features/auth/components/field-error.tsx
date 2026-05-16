import * as React from "react";

/**
 * Renders the first Zod validation error for a given field (if any).
 * Designed to play with the `fieldErrors` shape returned by the auth
 * server actions:
 *   `fieldErrors: Record<string, string[]>`
 */
export function FieldError({
  errors,
  name,
}: {
  errors?: Record<string, string[] | undefined>;
  name: string;
}) {
  const message = errors?.[name]?.[0];
  if (!message) return null;
  return (
    <p className="text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}
