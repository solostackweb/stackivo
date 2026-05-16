"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AuthFormError,
} from "@/features/auth/components/auth-form-shell";
import { FieldError } from "@/features/auth/components/field-error";
import { saveBusinessStep } from "../actions";
import { BUSINESS_TYPE_OPTIONS } from "../types";
import type { ActionResult } from "../actions";
import type { BusinessProfile } from "../types";
import { StateSelect } from "./state-select";

export function BusinessStepForm({ profile }: { profile: BusinessProfile }) {
  const [state, formAction] = useActionState<ActionResult | undefined, FormData>(
    saveBusinessStep,
    undefined,
  );
  const errs = state && !state.ok ? state.fieldErrors : undefined;

  const [businessType, setBusinessType] = React.useState<string>(
    profile.businessType ?? "individual",
  );

  return (
    <form action={formAction} className="space-y-5">
      <AuthFormError message={state && !state.ok ? state.error : null} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="legalName" label="Legal name" required>
          <Input
            id="legalName"
            name="legalName"
            defaultValue={profile.legalName ?? profile.fullName}
            placeholder="As it appears on official documents"
            required
          />
          <FieldError errors={errs} name="legalName" />
        </Field>

        <Field id="businessName" label="Business name (optional)">
          <Input
            id="businessName"
            name="businessName"
            defaultValue={profile.businessName ?? ""}
            placeholder="Your studio / brand name"
          />
          <FieldError errors={errs} name="businessName" />
        </Field>
      </div>

      <Field id="businessType" label="Business type" required>
        <Select value={businessType} onValueChange={setBusinessType}>
          <SelectTrigger id="businessType">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BUSINESS_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="businessType" value={businessType} />
        <FieldError errors={errs} name="businessType" />
      </Field>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Registered address</Label>
        <Input
          name="addressLine1"
          defaultValue={profile.addressLine1 ?? ""}
          placeholder="Address line 1"
          required
        />
        <FieldError errors={errs} name="addressLine1" />

        <Input
          name="addressLine2"
          defaultValue={profile.addressLine2 ?? ""}
          placeholder="Address line 2 (optional)"
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Input
              name="city"
              defaultValue={profile.city ?? ""}
              placeholder="City"
              required
            />
            <FieldError errors={errs} name="city" />
          </div>
          <div className="space-y-1.5">
            <StateSelect
              name="stateCode"
              defaultValue={profile.stateCode}
              required
              placeholder="State"
            />
            <FieldError errors={errs} name="stateCode" />
          </div>
          <div className="space-y-1.5">
            <Input
              name="postalCode"
              defaultValue={profile.postalCode ?? ""}
              placeholder="Postal code"
              inputMode="numeric"
            />
            <FieldError errors={errs} name="postalCode" />
          </div>
        </div>
      </div>

      <input type="hidden" name="country" value={profile.country || "IN"} />

      <div className="flex justify-end pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
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
