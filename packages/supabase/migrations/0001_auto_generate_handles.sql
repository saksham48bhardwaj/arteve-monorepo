-- 0001: Auto-generate unique handles on signup, backfill, NOT NULL.

create or replace function public.generate_unique_handle(seed text)
returns text
language plpgsql
as $$
declare
  base    text;
  candidate text;
  suffix  int := 0;
begin
  base := lower(regexp_replace(split_part(seed, '@', 1), '[^a-z0-9]+', '', 'g'));
  if base = '' or base is null then
    base := 'user';
  end if;
  candidate := base;
  while exists (select 1 from public.profiles where handle = candidate) loop
    suffix := suffix + 1;
    candidate := base || suffix::text;
  end loop;
  return candidate;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, display_name, handle)
  values (
    new.id,
    new.email,
    public.generate_unique_handle(new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

update public.profiles
set handle = public.generate_unique_handle(coalesce(display_name, id::text))
where handle is null;

alter table public.profiles
  alter column handle set not null;
