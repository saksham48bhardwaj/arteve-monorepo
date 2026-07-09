-- 0017: allow user / profile deletion (dashboard + in-app "delete account").
--
-- BUG: deleting an auth user cascaded to `profiles`, but 9 foreign keys were
-- ON DELETE NO ACTION, so Postgres refused the delete (both the Supabase
-- dashboard "Delete user" and the delete-account edge function failed).
--
-- Fix: make those FKs ON DELETE CASCADE so a user's own rows go with them.
-- NOTE (product decision): this is FULL erasure — deleting a user also deletes
-- their bookings, gigs and applications. If you later want to preserve a
-- counterparty's booking history, switch bookings to an anonymize/soft-delete
-- approach instead of cascade.

begin;

-- referencing auth.users
alter table public.messages drop constraint messages_recipient_id_fkey;
alter table public.messages add constraint messages_recipient_id_fkey
  foreign key (recipient_id) references auth.users(id) on delete cascade;

alter table public.conversations drop constraint conversations_created_by_fkey;
alter table public.conversations add constraint conversations_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete cascade;

alter table public.conversation_participants drop constraint conversation_participants_user_id_fkey;
alter table public.conversation_participants add constraint conversation_participants_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- post_comments.user_id had TWO fkeys (one -> profiles CASCADE, one -> auth.users
-- NO ACTION). Drop the redundant auth.users one that was blocking deletes.
alter table public.post_comments drop constraint post_comments_user_id_fkey;

-- referencing public.profiles
alter table public.applications drop constraint applications_organizer_id_fkey;
alter table public.applications add constraint applications_organizer_id_fkey
  foreign key (organizer_id) references public.profiles(id) on delete cascade;

alter table public.gigs drop constraint gigs_created_by_fkey;
alter table public.gigs add constraint gigs_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete cascade;

alter table public.posts drop constraint posts_profile_id_fkey;
alter table public.posts add constraint posts_profile_id_fkey
  foreign key (profile_id) references public.profiles(id) on delete cascade;

alter table public.bookings drop constraint bookings_organizer_id_fkey;
alter table public.bookings add constraint bookings_organizer_id_fkey
  foreign key (organizer_id) references public.profiles(id) on delete cascade;

alter table public.bookings drop constraint bookings_musician_id_fkey;
alter table public.bookings add constraint bookings_musician_id_fkey
  foreign key (musician_id) references public.profiles(id) on delete cascade;

commit;
