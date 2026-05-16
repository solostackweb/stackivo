"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthFormError } from "@/features/auth/components/auth-form-shell";
import { FieldError } from "@/features/auth/components/field-error";
import { saveInvoiceStep, type ActionResult } from "../actions";
import type { BusinessProfile } from "../types";

const CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;
const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
];

export function InvoiceStepForm({ profile }: { profile: BusinessProfile }) {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(
    saveInvoiceStep,
    undefined,
  );
  const errs = state && !state.ok ? state.fieldErrors : undefined;
  const [currency, setCurrency] = React.useState<string>(
    profile.defaultCurrency || "INR",
  );
  const [timezone, setTimezone] = React.useState<string>(
    profile.timezone || "Asia/Kolkata",
  );

  return (
    <form action={formAction} className="space-y-5">
      <AuthFormError message={state && !state.ok ? state.error : null} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="defaultCurrency">Default currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="defaultCurrency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="defaultCurrency" value={currency} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="timezone" value={timezone} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invoicePrefix">Invoice prefix</Label>
          <Input
            id="invoicePrefix"
            name="invoicePrefix"
            defaultValue={profile.invoicePrefix ?? "INV-"}
            placeholder="INV-"
          />
          <FieldError errors={errs} name="invoicePrefix" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invoiceNextNumber">Next invoice number</Label>
          <Input
            id="invoiceNextNumber"
            name="invoiceNextNumber"
            type="number"
            min={1}
            defaultValue={profile.invoiceNextNumber || 1}
          />
          <FieldError errors={errs} name="invoiceNextNumber" />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="invoiceDefaultDueDays">
            Default payment terms (days)
          </Label>
          <Input
            id="invoiceDefaultDueDays"
            name="invoiceDefaultDueDays"
            type="number"
            min={0}
            max={365}
            defaultValue={profile.invoiceDefaultDueDays || 14}
          />
          <FieldError errors={errs} name="invoiceDefaultDueDays" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="invoiceDefaultNotes">Default invoice notes</Label>
        <Textarea
          id="invoiceDefaultNotes"
          name="invoiceDefaultNotes"
          defaultValue={profile.invoiceDefaultNotes ?? ""}
          placeholder="Thanks for your business — payment due within 14 days."
          rows={2}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="invoiceDefaultTerms">Default invoice terms</Label>
        <Textarea
          id="invoiceDefaultTerms"
          name="invoiceDefaultTerms"
          defaultValue={profile.invoiceDefaultTerms ?? ""}
          placeholder="Late payments may be charged at…"
          rows={3}
        />
      </div>

      <div className="flex justify-end pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Continue"}
    </Button>
  );
}
