"use client";

import * as React from "react";
import { Trash2, GripVertical } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import { computeItemAmount } from "../../schema";
import type { InvoiceFormValues } from "../../schema";

interface InvoiceItemRowProps {
  index: number;
  canRemove: boolean;
  onRemove: () => void;
}

/**
 * Reusable line-item row. Reads/writes directly against the parent RHF context
 * via `{...register}`. The computed `amount` is derived from `quantity × rate`
 * using `useWatch` so it updates as the user types without triggering re-renders
 * on unrelated fields.
 */
export function InvoiceItemRow({
  index,
  canRemove,
  onRemove,
}: InvoiceItemRowProps) {
  const {
    register,
    formState: { errors },
    control,
  } = useFormContext<InvoiceFormValues>();

  const item = useWatch({ control, name: `items.${index}` });
  const amount = item
    ? computeItemAmount({ quantity: item.quantity, rate: item.rate })
    : 0;

  const itemErrors = errors.items?.[index];

  return (
    <div className="group grid grid-cols-12 items-start gap-2 border-b px-3 py-2.5 last:border-b-0 hover:bg-muted/30">
      <div className="col-span-1 flex h-9 items-center justify-center text-muted-foreground">
        <GripVertical className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="col-span-5">
        <Input
          {...register(`items.${index}.description`)}
          placeholder="Describe the work or deliverable…"
          className={cn(
            "h-9 border-transparent bg-transparent shadow-none focus-visible:border-input focus-visible:bg-background",
            itemErrors?.description && "border-destructive/60",
          )}
          aria-invalid={!!itemErrors?.description}
        />
        {itemErrors?.description?.message && (
          <p className="mt-1 text-[11px] text-destructive">
            {itemErrors.description.message}
          </p>
        )}
      </div>

      <div className="col-span-2">
        <Input
          {...register(`items.${index}.quantity`)}
          type="number"
          step="0.01"
          min="0"
          className={cn(
            "h-9 border-transparent bg-transparent text-right tabular-nums shadow-none focus-visible:border-input focus-visible:bg-background",
            itemErrors?.quantity && "border-destructive/60",
          )}
          aria-invalid={!!itemErrors?.quantity}
        />
      </div>

      <div className="col-span-2">
        <Input
          {...register(`items.${index}.rate`)}
          type="number"
          step="1"
          min="0"
          className={cn(
            "h-9 border-transparent bg-transparent text-right tabular-nums shadow-none focus-visible:border-input focus-visible:bg-background",
            itemErrors?.rate && "border-destructive/60",
          )}
          aria-invalid={!!itemErrors?.rate}
        />
      </div>

      <div className="col-span-1 flex h-9 items-center justify-end pr-1 text-sm font-medium tabular-nums">
        {formatINR(amount)}
      </div>

      <div className="col-span-1 flex h-9 items-center justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive disabled:opacity-20"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label="Remove line item"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function InvoiceItemsHeader() {
  return (
    <div className="grid grid-cols-12 items-center gap-2 border-b bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      <div className="col-span-1" />
      <div className="col-span-5">Description</div>
      <div className="col-span-2 text-right">Qty</div>
      <div className="col-span-2 text-right">Rate</div>
      <div className="col-span-1 text-right">Amount</div>
      <div className="col-span-1" />
    </div>
  );
}
