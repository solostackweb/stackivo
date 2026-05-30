alter table public.invoices
  add column if not exists discount_amount numeric(14,2) not null default 0;

alter table public.invoices
  add constraint invoices_discount_amount_non_negative
  check (discount_amount >= 0);
