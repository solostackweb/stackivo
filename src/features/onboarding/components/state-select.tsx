"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INDIAN_STATES } from "@/features/gst/state-codes";

/**
 * Dropdown of all Indian state / UT codes. Submits the two-digit code via
 * a hidden input so the surrounding `<form>` works without controlled state.
 */
export function StateSelect({
  name,
  defaultValue,
  value,
  onValueChange,
  required,
  placeholder = "Select state",
  id,
}: {
  name: string;
  id?: string;
  defaultValue?: string | null;
  value?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const [internalValue, setInternalValue] = React.useState<string>(
    defaultValue ?? "",
  );
  const isControlled = typeof value !== "undefined";
  const selected = isControlled ? value : internalValue;
  const handleChange = (next: string) => {
    if (!isControlled) setInternalValue(next);
    onValueChange?.(next);
  };
  return (
    <>
      <Select value={selected} onValueChange={handleChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {INDIAN_STATES.map((s) => (
            <SelectItem key={s.code} value={s.code}>
              {s.name}{" "}
              <span className="text-muted-foreground">({s.code})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input
        type="hidden"
        name={name}
        value={selected}
        required={required}
      />
    </>
  );
}
