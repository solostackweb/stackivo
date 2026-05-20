"use client";

/**
 * Centralised imperative confirm dialog.
 *
 * Usage:
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: "Delete invoice",
 *     description: "This cannot be undone.",
 *     confirmLabel: "Delete",   // optional — default "Confirm"
 *     variant: "destructive",   // optional — styles the confirm button red
 *   });
 *   if (!ok) return;
 *
 * The <ConfirmDialogProvider> is mounted once in AppProviders and covers
 * the entire app — no per-component setup required.
 */

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "destructive" styles the confirm button red. Default: "default". */
  variant?: "default" | "destructive";
}

interface ConfirmState {
  open: boolean;
  opts: ConfirmOptions;
  resolve: (value: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ConfirmDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<ConfirmState | null>(null);

  const confirm = React.useCallback(
    (opts: ConfirmOptions): Promise<boolean> =>
      new Promise((resolve) => {
        setState({ open: true, opts, resolve });
      }),
    [],
  );

  const settle = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog
        open={state?.open ?? false}
        onOpenChange={(open) => {
          // Pressing Escape or clicking the overlay counts as Cancel.
          if (!open) settle(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state?.opts.title}</AlertDialogTitle>
            {state?.opts.description && (
              <AlertDialogDescription>
                {state.opts.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)}>
              {state?.opts.cancelLabel ?? "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => settle(true)}
              className={cn(
                state?.opts.variant === "destructive" &&
                  buttonVariants({ variant: "destructive" }),
              )}
            >
              {state?.opts.confirmLabel ?? "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used inside <ConfirmDialogProvider>");
  }
  return ctx.confirm;
}
