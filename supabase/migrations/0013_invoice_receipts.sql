-- =============================================================================
-- 0013_invoice_receipts.sql - Invoice receipt and payment metadata
-- =============================================================================
-- Keeps invoices as payment requests while adding lightweight receipt metadata
-- generated after payment. This avoids invoice signing/approval complexity.
-- =============================================================================

alter table public.invoices
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists payment_amount numeric(14,2),
  add column if not exists payment_recorded_at timestamptz,
  add column if not exists receipt_number text,
  add column if not exists receipt_generated_at timestamptz;

create index if not exists invoices_receipt_generated_at_idx
  on public.invoices (receipt_generated_at);

create unique index if not exists invoices_user_receipt_number_idx
  on public.invoices (user_id, receipt_number)
  where receipt_number is not null;
