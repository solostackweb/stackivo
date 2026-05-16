"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

import type { ClientRecord } from "../server";
import { deleteClientAction } from "../actions";
import { getClientDisplayName } from "../utils";

interface DeleteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientRecord | null;
  /**
   * Optional callback invoked after a successful delete. Useful for
   * routing away from a profile page that no longer exists.
   */
  onDeleted?: () => void;
}

/**
 * Confirmation dialog for irreversible client deletion. Submits via the
 * `deleteClientAction` server action; on success we refresh the route so
 * lists / aggregates re-fetch.
 */
export function DeleteClientDialog({
  open,
  onOpenChange,
  client,
  onDeleted,
}: DeleteClientDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const handleConfirm = () => {
    if (!client) return;
    const fd = new FormData();
    fd.set("id", client.id);
    startTransition(async () => {
      const res = await deleteClientAction(undefined, fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Client deleted");
      onOpenChange(false);
      onDeleted?.();
      router.refresh();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete client?</AlertDialogTitle>
          <AlertDialogDescription>
            {client ? (
              <>
                This permanently deletes{" "}
                <strong>{getClientDisplayName(client)}</strong> and unlinks
                them from any associated invoices, projects, and time
                entries. This can&apos;t be undone.
              </>
            ) : (
              "This action can't be undone."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending ? "Deleting…" : "Delete client"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
