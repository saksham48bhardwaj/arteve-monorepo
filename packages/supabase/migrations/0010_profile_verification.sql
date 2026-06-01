-- 0010 — Verified badge (roadmap C1) (applied 2026-05-31)
--
-- Adds profiles.verified / verified_at. Verification is NOT self-grantable:
-- end-user requests arrive via PostgREST as the 'authenticated'/'anon' JWT
-- role, and for those the BEFORE UPDATE trigger preserves the existing values
-- so a user can't PATCH themselves verified. Admin/service connections (no
-- end-user JWT role) can still set it. The trigger never raises, so it cannot
-- break a normal profile update.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE OR REPLACE FUNCTION public.protect_profile_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
begin
  if auth.role() in ('authenticated', 'anon') then
    new.verified := old.verified;
    new.verified_at := old.verified_at;
  end if;
  return new;
end;
$$;

DROP TRIGGER IF EXISTS protect_profile_verification ON public.profiles;
CREATE TRIGGER protect_profile_verification
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_verification();
