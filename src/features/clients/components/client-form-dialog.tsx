"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { StateSelect } from "@/features/onboarding/components/state-select";
import { useProfile } from "@/features/profile/context";

import type { ClientRecord } from "../server";
import {
  createClientAction,
  updateClientAction,
  type ActionResult,
} from "../actions";

// Both `createClientAction` + `updateClientAction` resolve to this shape;
// the client-side form only reads `ok` / `error` / `fieldErrors`.
type ClientFormResult = ActionResult<{ id: string }>;

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog is in "edit" mode and pre-fills the form. */
  client?: ClientRecord;
  onSaved?: (client: {
    id: string;
    fullName: string;
    businessName: string | null;
    email: string | null;
  }) => void;
}

/**
 * Add / edit client dialog. Submits via the GST-aware
 * `createClientAction` / `updateClientAction` server actions and refreshes
 * the surrounding route on success so the new row shows up immediately.
 */
export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSaved,
}: ClientFormDialogProps) {
  const router = useRouter();
  const { profile } = useProfile();
  const isEdit = !!client;
  const [pending, startTransition] = React.useTransition();
  const [state, setState] = React.useState<ClientFormResult | undefined>();
  const [gstRegistered, setGstRegistered] = React.useState<boolean>(
    client?.gstRegistered ?? false,
  );

  // Reset transient state when the dialog re-opens or switches client.
  React.useEffect(() => {
    if (open) {
      setState(undefined);
      setGstRegistered(client?.gstRegistered ?? false);
    }
  }, [open, client]);

  const errs = state && !state.ok ? state.fieldErrors : undefined;
  const userHasGstRegistration = profile?.gstRegistered ?? false;

  const handleSubmit = (formData: FormData) => {
    const draftClient = {
      fullName: String(formData.get("fullName") ?? "").trim(),
      businessName: String(formData.get("businessName") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
    };
    // Enforce: only allow GST registration if user has GST registration
    const finalGstRegistered = userHasGstRegistration && gstRegistered;
    formData.set("gstRegistered", finalGstRegistered ? "true" : "false");
    if (isEdit) formData.set("id", client.id);
    startTransition(async () => {
      const res = isEdit
        ? await updateClientAction(undefined, formData)
        : await createClientAction(undefined, formData);
      setState(res);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (!isEdit && res.data?.id) {
        onSaved?.({
          id: res.data.id,
          fullName: draftClient.fullName,
          businessName: draftClient.businessName,
          email: draftClient.email,
        });
      }
      toast.success(res.message ?? (isEdit ? "Client updated" : "Client added"));
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <div className="border-b px-6 py-4 flex-shrink-0">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit client" : "Add client"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update this client's contact and billing details."
                : "Add a new client to your workspace. You can invoice them right away."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form
          id="client-form"
          action={handleSubmit}
          className="space-y-5 px-6 py-4 overflow-y-auto flex-1"
        >
          {state && !state.ok && (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {state.error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client name" required error={errs?.fullName?.[0]}>
              <Input
                name="fullName"
                defaultValue={client?.fullName ?? ""}
                required
                placeholder="Acme Corp."
              />
            </Field>
            <Field label="Business name" error={errs?.businessName?.[0]}>
              <Input
                name="businessName"
                defaultValue={client?.businessName ?? ""}
                placeholder="Legal entity, if different"
              />
            </Field>
            <Field label="Email" error={errs?.email?.[0]}>
              <Input
                name="email"
                type="email"
                defaultValue={client?.email ?? ""}
                placeholder="contact@acme.com"
              />
            </Field>
            <Field label="Phone" error={errs?.phone?.[0]}>
              <Input
                name="phone"
                type="tel"
                defaultValue={client?.phone ?? ""}
                placeholder="+91 …"
              />
            </Field>
          </div>

          <div className="flex items-start justify-between rounded-md border p-4">
            <div className="space-y-1">
              <Label htmlFor="gstRegistered" className="text-sm font-medium">
                GST registered?
              </Label>
              <p className="text-xs text-muted-foreground">
                {userHasGstRegistration
                  ? "Toggle on to capture their GSTIN and bill them as B2B."
                  : "Enable GST registration in your profile to bill GST-registered clients."}
              </p>
            </div>
            <Switch
              id="gstRegistered"
              checked={userHasGstRegistration ? gstRegistered : false}
              onCheckedChange={userHasGstRegistration ? setGstRegistered : undefined}
              disabled={!userHasGstRegistration}
            />
          </div>

          {userHasGstRegistration && gstRegistered && (
            <Field label="GSTIN" required error={errs?.gstin?.[0]}>
              <Input
                name="gstin"
                defaultValue={client?.gstin ?? ""}
                maxLength={15}
                placeholder="22AAAAA0000A1Z5"
                className="font-mono uppercase"
                required
              />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="State" required={userHasGstRegistration && gstRegistered} error={errs?.stateCode?.[0]}>
              <StateSelect
                name="stateCode"
                defaultValue={client?.stateCode ?? undefined}
                required={userHasGstRegistration && gstRegistered}
              />
            </Field>
            <Field
              label="Billing address"
              required={userHasGstRegistration && gstRegistered}
              error={errs?.billingAddress?.[0]}
              className="sm:col-span-2"
            >
              <Textarea
                name="billingAddress"
                rows={2}
                defaultValue={client?.billingAddress ?? ""}
                required={userHasGstRegistration && gstRegistered}
                placeholder="Street, city, postal code"
              />
            </Field>
          </div>

          <Field label="Notes" error={errs?.notes?.[0]}>
            <Textarea
              name="notes"
              rows={3}
              defaultValue={client?.notes ?? ""}
              placeholder="Payment terms, key contacts, anything worth remembering…"
            />
          </Field>
        </form>

        <div className="border-t px-6 py-4 flex-shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="client-form"
            disabled={pending}
          >
            {pending ? "Saving…" : isEdit ? "Save changes" : "Add client"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
