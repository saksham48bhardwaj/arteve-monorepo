Arteve — Supabase migrations
============================

Source of truth for the database schema. Apply in filename order.

Conventions
-----------
- Files are timestamped `NNNN_short_name.sql` so they apply in order.
- Each file is idempotent where reasonable (`if not exists`, `on conflict do nothing`).
- DDL goes here. Seed data lives in `../seed.sql`.

Bootstrap on a fresh project
----------------------------
1. Run `0000_base_schema.sql` to create the core tables (`profiles`, `posts`, `gigs`, etc.) and storage buckets.
2. Apply every later `NNNN_*.sql` file in order.
3. Run `../seed.sql` to populate demo data (musicians, organizers, gigs, posts, bookings, etc.).

What's in each file
-------------------
- `0000_base_schema.sql`           — full schema as it stood after the restore
- `0001_auto_generate_handles.sql` — auto-generate unique profile handles on signup + backfill
- `0002_consolidate_comments.sql`  — migrate legacy `comments` into `post_comments` and drop `comments`
- `0003_consolidate_messaging.sql` — unify `booking_messages` into `conversations`/`messages`, fix RLS
- `0004_reviews.sql`               — `reviews` table, RLS, and `profile_ratings` view
