-- 0008 — Security & performance advisor remediation (applied 2026-05-31)
--
-- Pins a non-mutable search_path on the three functions the Supabase security
-- linter flagged (function_search_path_mutable), and adds a covering index for
-- the one remaining unindexed foreign key (reviews.reviewer_id).

ALTER FUNCTION public.booking_messages_insert_compat() SET search_path = pg_catalog, public;
ALTER FUNCTION public.booking_messages_update_compat() SET search_path = pg_catalog, public;
ALTER FUNCTION public.whoami() SET search_path = pg_catalog, public;

CREATE INDEX IF NOT EXISTS reviews_reviewer_id_idx ON public.reviews(reviewer_id);
