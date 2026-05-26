-- 0007: Backward-compat for the dropped booking_messages table.
-- Exposes a view + INSTEAD OF triggers so existing chat pages keep working
-- while we refactor them to use the conversation model directly.

create or replace view public.booking_messages as
select
  m.id,
  c.booking_id,
  m.sender_id,
  m.recipient_id,
  m.content,
  m.created_at,
  m.read_at
from public.messages m
join public.conversations c on c.id = m.conversation_id
where c.booking_id is not null;

create or replace function public.booking_messages_insert_compat()
returns trigger language plpgsql security definer as $$
declare v_conversation_id uuid;
begin
  select id into v_conversation_id from public.conversations
   where booking_id = new.booking_id limit 1;
  if v_conversation_id is null then
    insert into public.conversations (created_by, booking_id)
      values (new.sender_id, new.booking_id) returning id into v_conversation_id;
    insert into public.conversation_participants (conversation_id, user_id)
      values (v_conversation_id, new.sender_id), (v_conversation_id, new.recipient_id)
      on conflict do nothing;
  end if;
  insert into public.messages (id, conversation_id, sender_id, recipient_id, content, body, created_at, read_at)
  values (coalesce(new.id, gen_random_uuid()), v_conversation_id, new.sender_id, new.recipient_id,
          new.content, new.content, coalesce(new.created_at, now()), new.read_at);
  return new;
end$$;

create or replace function public.booking_messages_update_compat()
returns trigger language plpgsql security definer as $$
begin
  update public.messages
     set sender_id=new.sender_id, recipient_id=new.recipient_id,
         content=new.content, body=new.content, read_at=new.read_at
   where id = old.id;
  return new;
end$$;

drop trigger if exists booking_messages_insert_trg on public.booking_messages;
drop trigger if exists booking_messages_update_trg on public.booking_messages;

create trigger booking_messages_insert_trg
  instead of insert on public.booking_messages
  for each row execute function public.booking_messages_insert_compat();

create trigger booking_messages_update_trg
  instead of update on public.booking_messages
  for each row execute function public.booking_messages_update_compat();

grant select, insert, update on public.booking_messages to anon, authenticated;
