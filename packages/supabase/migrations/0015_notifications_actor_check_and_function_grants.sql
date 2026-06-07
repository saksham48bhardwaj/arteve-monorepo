-- 0015: QA round hardening (June 7, 2026)
--
-- 1. notifications INSERT was WITH CHECK (true) — any signed-in user could
--    insert notifications impersonating anyone (NULL or forged actor_id).
--    sendNotification() always sets actor_id = auth.uid(), so requiring it
--    is app-compatible and blocks spoofing.
-- 2. SECURITY DEFINER trigger/compat functions were EXECUTE-able by anon +
--    authenticated via /rest/v1/rpc/* (advisor lint 0028/0029). None are
--    called by the apps (only rpc('whoami') is used) and trigger functions
--    don't need caller EXECUTE at fire time. is_conversation_participant is
--    intentionally left callable — RLS policies evaluate it as the caller.

begin;

drop policy if exists "notifs_insert_any" on public.notifications;
create policy "notifs_insert_authored" on public.notifications
  for insert with check (auth.uid() = actor_id);

revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.protect_profile_verification() from anon, authenticated, public;
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
revoke execute on function public.booking_messages_insert_compat() from anon, authenticated, public;
revoke execute on function public.booking_messages_update_compat() from anon, authenticated, public;

commit;
