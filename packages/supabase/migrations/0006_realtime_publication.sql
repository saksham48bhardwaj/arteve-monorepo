-- 0006: Make sure realtime publishes inserts/updates for chat + notifications.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='messages') then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='notifications') then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='post_likes') then
    execute 'alter publication supabase_realtime add table public.post_likes';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='post_comments') then
    execute 'alter publication supabase_realtime add table public.post_comments';
  end if;
end$$;
