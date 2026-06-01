-- 0011 — Let users mark their own notifications read (applied 2026-06-01)
--
-- `notifications` shipped with only INSERT (notifs_insert_any) and SELECT
-- (notifs_read_own) RLS policies. RLS is enabled, and with no UPDATE policy
-- every "mark as read" / "mark all read" UPDATE was silently rejected (0 rows
-- affected, no error), so read_at never persisted: notifications stayed unread
-- forever and the unread badge never came down. This adds an owner-scoped
-- UPDATE policy so a user can update only their own notification rows.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'notifs_update_own'
  ) then
    create policy notifs_update_own on public.notifications
      for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end$$;
