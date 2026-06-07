-- 0013: Fix posts RLS owner checks + scope media uploads to the uploader's folder.
--
-- BUG: posts UPDATE/DELETE policies checked `author_id`, but the apps insert
-- rows with `profile_id` only (author_id stays NULL). Result: deleting your
-- own post silently affected 0 rows — the post "came back" after reload.
--
-- Fix: backfill author_id, then make all owner checks accept either column.
-- Also drop the over-broad "any authenticated user may insert any row"
-- policy (impersonation risk) and require profile_id = auth.uid() on insert.
-- Finally, scope media bucket uploads to the uploader's own folder
-- ({prefix}/{auth.uid()}/...), matching every upload path used by the apps.

begin;

-- 1. Backfill so legacy rows satisfy either-column owner checks.
update public.posts set author_id = profile_id where author_id is null;

-- 2. Owner-scoped UPDATE / DELETE that match how the apps actually write rows.
drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts
  for delete using (auth.uid() = profile_id or auth.uid() = author_id);

drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own" on public.posts
  for update using (auth.uid() = profile_id or auth.uid() = author_id)
  with check (auth.uid() = profile_id or auth.uid() = author_id);

-- 3. INSERT: require the row to belong to the caller (replaces the broad
--    "authenticated may insert anything" policy + redundant author_id one).
drop policy if exists "posts_insert_authenticated" on public.posts;
drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts
  for insert with check (
    auth.uid() = profile_id
    and (author_id is null or author_id = auth.uid())
  );

-- 4. Storage: media uploads must land in the caller's own folder.
--    All app upload paths are {prefix}/{uid}/{file} with prefix in
--    profiles | avatars | venue-photos.
drop policy if exists "media: authenticated upload" on storage.objects;
create policy "media: authenticated upload" on storage.objects
  for insert with check (
    bucket_id = 'media'
    and (storage.foldername(name))[2] = (auth.uid())::text
  );

commit;
