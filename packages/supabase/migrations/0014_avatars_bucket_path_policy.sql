-- 0014: avatars bucket policies vs actual upload paths.
--
-- Musician profile-edit uploads avatars to the `avatars` bucket at
-- `profiles/{uid}/{file}`, but the bucket's INSERT/UPDATE policies required
-- the FIRST folder to equal auth.uid() (`{uid}/...`) — so avatar upload was
-- rejected by RLS. Accept both layouts (own folder either depth-1 or under a
-- `profiles/` prefix).

begin;

drop policy if exists "avatars: authenticated upload" on storage.objects;
create policy "avatars: authenticated upload" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = (auth.uid())::text
      or (storage.foldername(name))[2] = (auth.uid())::text
    )
  );

drop policy if exists "avatars: authenticated update" on storage.objects;
create policy "avatars: authenticated update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = (auth.uid())::text
      or (storage.foldername(name))[2] = (auth.uid())::text
    )
  );

commit;
