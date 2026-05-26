-- 0002: Merge legacy `comments` into `post_comments` and drop `comments`.

insert into public.post_comments (post_id, user_id, comment, created_at)
select c.post_id, c.author_id, c.text, c.created_at
from public.comments c
where not exists (
  select 1 from public.post_comments pc
  where pc.post_id = c.post_id
    and pc.user_id = c.author_id
    and pc.comment = c.text
);

drop table if exists public.comments;
