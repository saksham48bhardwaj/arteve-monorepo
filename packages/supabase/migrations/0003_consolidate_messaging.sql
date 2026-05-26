-- 0003: Unify messaging models.
-- Canonical model: conversations + conversation_participants + messages (with conversation_id).
-- Migrates booking_messages into messages (one conversation per booking),
-- rewrites RLS, and drops the legacy table.

-- 1) Ensure every booking has a conversation.
insert into public.conversations (id, created_by, booking_id, created_at)
select gen_random_uuid(), b.organizer_id, b.id, b.created_at
from public.bookings b
where not exists (
  select 1 from public.conversations c where c.booking_id = b.id
);

-- 1b) Backfill participants for newly created conversations.
insert into public.conversation_participants (conversation_id, user_id, role)
select c.id, b.organizer_id, 'organizer'
from public.conversations c
join public.bookings b on b.id = c.booking_id
where not exists (
  select 1 from public.conversation_participants cp
  where cp.conversation_id = c.id and cp.user_id = b.organizer_id
);

insert into public.conversation_participants (conversation_id, user_id, role)
select c.id, b.musician_id, 'musician'
from public.conversations c
join public.bookings b on b.id = c.booking_id
where not exists (
  select 1 from public.conversation_participants cp
  where cp.conversation_id = c.id and cp.user_id = b.musician_id
);

-- 2) Migrate booking_messages → messages.
insert into public.messages (id, conversation_id, sender_id, recipient_id, content, body, created_at, read_at)
select
  bm.id,
  c.id,
  bm.sender_id,
  bm.recipient_id,
  bm.content,
  bm.content,
  bm.created_at,
  bm.read_at
from public.booking_messages bm
join public.conversations c on c.booking_id = bm.booking_id
where not exists (select 1 from public.messages m where m.id = bm.id);

-- 3) Rebuild messages RLS for the conversation model.
drop policy if exists members_can_read_messages on public.messages;
drop policy if exists members_can_insert_messages on public.messages;
drop policy if exists messages_select_participants on public.messages;
drop policy if exists messages_insert_participants on public.messages;
drop policy if exists messages_update_recipient on public.messages;

create policy messages_select_participants on public.messages
  for select to public
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id
        and cp.user_id = auth.uid()
    )
  );

create policy messages_insert_participants on public.messages
  for insert to public
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id
        and cp.user_id = auth.uid()
    )
  );

create policy messages_update_recipient on public.messages
  for update to public
  using (auth.uid() = recipient_id);

-- Fix the bug in the conversation_participants select policy
-- (the prior version referenced cp.conversation_id = cp.conversation_id — always true).
drop policy if exists "Participants can view conversation members" on public.conversation_participants;
drop policy if exists conv_participants_select on public.conversation_participants;
create policy conv_participants_select on public.conversation_participants
  for select to public
  using (
    exists (
      select 1 from public.conversation_participants self
      where self.conversation_id = conversation_participants.conversation_id
        and self.user_id = auth.uid()
    )
  );

-- 4) Drop legacy artefacts.
alter table public.messages drop column if exists application_id;
drop table if exists public.booking_messages;
