-- =============================================================================
-- 0004_storage_buckets.sql — Supabase Storage buckets + access policies
-- -----------------------------------------------------------------------------
-- Implements SAD § 1.7:
--   Buckets: invoices, contracts, portal-files, profile-images, branding-assets
--   Security: user-private by default; public access only via signed URLs.
--
-- Convention:
--   * Every object is stored under a user-scoped prefix: `<user_id>/...`.
--   * Policies compare the first path segment to `auth.uid()` so the user
--     can only read/write their own files.
-- =============================================================================

-- --- Buckets ----------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('invoices',         'invoices',         false),
  ('contracts',        'contracts',        false),
  ('portal-files',     'portal-files',     false),
  ('profile-images',   'profile-images',   false),
  ('branding-assets',  'branding-assets',  false)
on conflict (id) do nothing;

-- --- Helper: compare first path segment to current user's uid ----------------
-- storage.foldername() returns text[], e.g. ['<uid>', 'invoices', '0042.pdf']
-- We reuse this pattern across every bucket policy.

-- --- invoices ---------------------------------------------------------------
create policy invoices_storage_read_own on storage.objects
  for select to authenticated
  using (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);

create policy invoices_storage_write_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);

create policy invoices_storage_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);

create policy invoices_storage_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);

-- --- contracts --------------------------------------------------------------
create policy contracts_storage_read_own on storage.objects
  for select to authenticated
  using (bucket_id = 'contracts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy contracts_storage_write_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'contracts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy contracts_storage_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'contracts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy contracts_storage_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'contracts' and (storage.foldername(name))[1] = auth.uid()::text);

-- --- portal-files -----------------------------------------------------------
create policy portal_files_storage_read_own on storage.objects
  for select to authenticated
  using (bucket_id = 'portal-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy portal_files_storage_write_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'portal-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy portal_files_storage_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'portal-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy portal_files_storage_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'portal-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- --- profile-images ---------------------------------------------------------
create policy profile_images_storage_read_own on storage.objects
  for select to authenticated
  using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy profile_images_storage_write_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy profile_images_storage_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy profile_images_storage_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- --- branding-assets --------------------------------------------------------
create policy branding_assets_storage_read_own on storage.objects
  for select to authenticated
  using (bucket_id = 'branding-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy branding_assets_storage_write_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'branding-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy branding_assets_storage_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'branding-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy branding_assets_storage_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'branding-assets' and (storage.foldername(name))[1] = auth.uid()::text);
