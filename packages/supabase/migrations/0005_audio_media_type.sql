-- 0005: Allow audio media on posts + media gallery.

alter table public.posts drop constraint if exists posts_media_type_check;
alter table public.posts add constraint posts_media_type_check
  check (media_type = any (array['image'::text, 'video'::text, 'audio'::text, 'none'::text]));

alter table public.media drop constraint if exists media_type_check;
alter table public.media add constraint media_type_check
  check (type = any (array['image'::text, 'video'::text, 'audio'::text]));
