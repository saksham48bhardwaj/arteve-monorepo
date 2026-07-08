-- 0016 — QA R6 hardening (advisor lints 0025 / 0028)
--
-- 1) Public buckets (`avatars`, `media`) had broad SELECT policies on
--    storage.objects, letting any client LIST every file in the bucket.
--    Public-URL access (/storage/v1/object/public/...) does not go through
--    RLS, and the apps never call .list()/.download() — only getPublicUrl,
--    upload and remove — so the read policies are pure attack surface.
--
-- 2) `is_conversation_participant` is a SECURITY DEFINER helper used by RLS
--    policies evaluated for signed-in users. Logged-out (anon) clients have
--    no conversations, so anon EXECUTE via /rest/v1/rpc/* is unnecessary.

drop policy if exists "avatars: public read" on storage.objects;
drop policy if exists "media: public read" on storage.objects;

revoke execute on function public.is_conversation_participant(uuid, uuid) from anon;
