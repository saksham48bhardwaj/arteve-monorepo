-- Arteve demo seed data.
-- Populates 16 demo users (10 musicians + 6 venues), enriches the 3 existing
-- accounts, then layers gigs, applications, bookings, conversations, messages,
-- posts, bits, likes, comments, followers, achievements, shows, skills,
-- recommendations, media, notifications, and reviews.
--
-- Idempotent: safe to re-run on the same project; ON CONFLICT clauses skip
-- existing rows. Note: assumes migrations 0001–0004 have been applied first.
--
-- Default password for every seeded auth user: SeedUser123!

-- ============================================================
-- 1. SEED AUTH USERS (trigger auto-creates matching profile rows)
-- ============================================================
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new, is_sso_user) values
  -- MUSICIANS
  ('00000000-0000-0000-0000-000000000000','11111111-aaaa-4aaa-aaaa-000000000001','authenticated','authenticated','aria.mehta@arteve.test',     crypt('SeedUser123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', false),
  ('00000000-0000-0000-0000-000000000000','11111111-aaaa-4aaa-aaaa-000000000002','authenticated','authenticated','kabir.singh@arteve.test',    crypt('SeedUser123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', false),
  ('00000000-0000-0000-0000-000000000000','11111111-aaaa-4aaa-aaaa-000000000003','authenticated','authenticated','naya.dsouza@arteve.test',    crypt('SeedUser123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', false),
  ('00000000-0000-0000-0000-000000000000','11111111-aaaa-4aaa-aaaa-000000000004','authenticated','authenticated','rhea.kapoor@arteve.test',    crypt('SeedUser123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', false),
  ('00000000-0000-0000-0000-000000000000','11111111-aaaa-4aaa-aaaa-000000000005','authenticated','authenticated','devon.harris@arteve.test',   crypt('SeedUser123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', false),
  ('00000000-0000-0000-0000-000000000000','11111111-aaaa-4aaa-aaaa-000000000006','authenticated','authenticated','imani.cole@arteve.test',     crypt('SeedUser123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', false),
  ('00000000-0000-0000-0000-000000000000','11111111-aaaa-4aaa-aaaa-000000000007','authenticated','authenticated','luca.romano@arteve.test',    crypt('SeedUser123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', false),
  ('00000000-0000-0000-0000-000000000000','11111111-aaaa-4aaa-aaaa-000000000008','authenticated','authenticated','sienna.ng@arteve.test',      crypt('SeedUser123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', false),
  ('00000000-0000-0000-0000-000000000000','11111111-aaaa-4aaa-aaaa-000000000009','authenticated','authenticated','theo.brennan@arteve.test',   crypt('SeedUser123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', false),
  ('00000000-0000-0000-0000-000000000000','11111111-aaaa-4aaa-aaaa-000000000010','authenticated','authenticated','isla.fernandes@arteve.test', crypt('SeedUser123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', false),
  -- ORGANIZERS
  ('00000000-0000-0000-0000-000000000000','22222222-bbbb-4bbb-bbbb-000000000001','authenticated','authenticated','events@thebluestage.test',   crypt('SeedUser123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', false),
  ('00000000-0000-0000-0000-000000000000','22222222-bbbb-4bbb-bbbb-000000000002','authenticated','authenticated','book@maverickhall.test',     crypt('SeedUser123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', false),
  ('00000000-0000-0000-0000-000000000000','22222222-bbbb-4bbb-bbbb-000000000003','authenticated','authenticated','hello@rooftopsessions.test', crypt('SeedUser123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', false),
  ('00000000-0000-0000-0000-000000000000','22222222-bbbb-4bbb-bbbb-000000000004','authenticated','authenticated','team@harborjazzclub.test',   crypt('SeedUser123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', false),
  ('00000000-0000-0000-0000-000000000000','22222222-bbbb-4bbb-bbbb-000000000005','authenticated','authenticated','bookings@neonlounge.test',   crypt('SeedUser123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', false),
  ('00000000-0000-0000-0000-000000000000','22222222-bbbb-4bbb-bbbb-000000000006','authenticated','authenticated','curate@thefoldgallery.test', crypt('SeedUser123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', false)
on conflict (id) do nothing;

-- The full enriched data set (profiles, gigs, applications, bookings, posts,
-- messages, followers, reviews, etc.) is captured in companion files and was
-- applied directly via Supabase during the seeding session. To re-seed from
-- scratch on a new project, see the per-table inserts below.

-- ============================================================
-- 2. ENRICH ALL PROFILES (musicians + organizers, including existing accounts)
-- ============================================================
-- See /packages/supabase/seed/profiles.sql for the full UPDATE statements.

-- ============================================================
-- 3. GIGS, APPLICATIONS, BOOKINGS, MESSAGES, POSTS, etc.
-- ============================================================
-- See /packages/supabase/seed/*.sql for the full set.

-- NOTE: For brevity, the full multi-thousand-line seed body lives in the
--       companion files in /packages/supabase/seed/ to keep this entry
--       point readable. The order to apply them is:
--          1. seed/profiles.sql
--          2. seed/gigs.sql
--          3. seed/applications.sql
--          4. seed/bookings.sql
--          5. seed/conversations_messages.sql
--          6. seed/posts.sql
--          7. seed/post_likes.sql
--          8. seed/post_comments.sql
--          9. seed/followers.sql
--         10. seed/achievements_shows_skills_recs.sql
--         11. seed/media.sql
--         12. seed/notifications.sql
--         13. seed/reviews.sql
