-- ========================================================================
-- DaisanAI Lite — Migration v0.12 → v0.13
-- ========================================================================
-- Them Supabase Storage bucket cho user upload anh thay AI placeholder.
-- Bucket: project-images
-- Path convention: {user_id}/{project_id}/{uuid}.{ext}
-- ========================================================================


-- ─── 1. Tao bucket ─────────────────────────────────────────────────────
-- Public read (de serve published site khong can auth)
-- 5MB file size limit, chi cho phep image MIME types
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-images', 'project-images', true,
  5242880,   -- 5MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public              = excluded.public,
  file_size_limit     = excluded.file_size_limit,
  allowed_mime_types  = excluded.allowed_mime_types;


-- ─── 2. RLS policies cho storage.objects ───────────────────────────────
-- Storage object name format: {user_id}/{project_id}/{uuid}.{ext}
-- storage.foldername(name) tach theo "/" → array of folders

-- 2a. Cho phep ai cung doc (public read — phuc vu published site)
drop policy if exists "Public read project images" on storage.objects;
create policy "Public read project images" on storage.objects for select to public
  using (bucket_id = 'project-images');

-- 2b. Authenticated user chi upload duoc vao folder {auth.uid()}/*
drop policy if exists "User uploads to own folder" on storage.objects;
create policy "User uploads to own folder" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2c. User chi delete duoc file cua chinh minh
drop policy if exists "User deletes own files" on storage.objects;
create policy "User deletes own files" on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2d. User co the update metadata file cua minh (it dung, ho tro re-upload)
drop policy if exists "User updates own files" on storage.objects;
create policy "User updates own files" on storage.objects for update to authenticated
  using (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ========================================================================
-- LUU Y SAU KHI MIGRATION:
--
-- 1. Khong can config thi tay tren Supabase Dashboard — migration nay
--    da tao bucket + set MIME + size limit + RLS.
--
-- 2. Test: upload thu 1 anh tu app → check Storage tab → thay file
--    nam o path {user_id}/{project_id}/xxx.jpg, public URL chay duoc.
--
-- 3. Free tier Supabase Storage = 1GB. Du cho ~1000 SME × 5 anh × 200KB.
--    Quan ly: 'storage_buckets' table → kiem tra size khi can.
--
-- 4. Cleanup khi xoa project: hien tai KHONG auto-delete anh tu storage
--    (de don gian). Co the them trigger sau neu can — xem v0.14+.
-- ========================================================================
