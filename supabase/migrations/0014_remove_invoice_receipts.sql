-- 0014_remove_invoice_receipts.sql - Remove invoice receipt workflow metadata
-- Invoices are the final paid billing document in SoloStack's simplified
-- workflow, so separate invoice receipts are no longer generated.

drop index if exists public.invoices_receipt_generated_at_idx;
drop index if exists public.invoices_user_receipt_number_idx;

alter table public.invoices
  drop column if exists receipt_number,
  drop column if exists receipt_generated_at;
