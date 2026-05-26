-- 0004: Reviews + aggregated profile_ratings view.

create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings(id) on delete cascade,
  reviewer_id  uuid not null references public.profiles(id) on delete cascade,
  reviewee_id  uuid not null references public.profiles(id) on delete cascade,
  rating       int  not null check (rating between 1 and 5),
  comment      text,
  created_at   timestamptz default now(),
  unique (booking_id, reviewer_id)
);

create index if not exists reviews_reviewee_idx on public.reviews(reviewee_id);
create index if not exists reviews_booking_idx  on public.reviews(booking_id);

alter table public.reviews enable row level security;

drop policy if exists reviews_select_all on public.reviews;
drop policy if exists reviews_insert_participants on public.reviews;
drop policy if exists reviews_update_own on public.reviews;
drop policy if exists reviews_delete_own on public.reviews;

create policy reviews_select_all on public.reviews
  for select to public using (true);

create policy reviews_insert_participants on public.reviews
  for insert to public
  with check (
    auth.uid() = reviewer_id
    and exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id
        and b.status = 'completed'
        and (
          (b.musician_id  = auth.uid() and b.organizer_id = reviews.reviewee_id) or
          (b.organizer_id = auth.uid() and b.musician_id  = reviews.reviewee_id)
        )
    )
  );

create policy reviews_update_own on public.reviews
  for update to public using (auth.uid() = reviewer_id);
create policy reviews_delete_own on public.reviews
  for delete to public using (auth.uid() = reviewer_id);

create or replace view public.profile_ratings as
select
  reviewee_id as profile_id,
  round(avg(rating)::numeric, 2) as avg_rating,
  count(*)::int as review_count
from public.reviews
group by reviewee_id;

grant select on public.profile_ratings to anon, authenticated;
