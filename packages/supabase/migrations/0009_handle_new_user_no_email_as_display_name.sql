-- 0009 — Stop seeding display_name with the account email (applied 2026-05-31)
--
-- Previously new email/password signups got display_name = email (the trigger
-- fell back to new.email), so accounts operated with their email shown as a
-- public name. New signups now get a NULL display_name until onboarding sets a
-- real one; the apps fall back to the handle. Onboarding is also enforced on
-- sign-in (see apps/*/src/app/login/page.tsx).

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  insert into public.profiles (id, display_name, handle, role, avatar_url)
  values (
    new.id,
    nullif(coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ), ''),
    public.generate_unique_handle(new.email),
    coalesce(new.raw_user_meta_data->>'role', 'musician'),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;
