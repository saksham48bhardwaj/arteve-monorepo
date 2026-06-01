-- 0012 — Let conversation participants mark messages read (applied 2026-06-01)
--
-- `messages_update_recipient` only allowed `auth.uid() = recipient_id`. But
-- conversation messages (keyed by conversation_id + sender_id, participant
-- based) never populate recipient_id — only booking_messages / DM-style rows
-- do. So `auth.uid() = recipient_id` was NULL for conversation messages and
-- the UPDATE was rejected: recipients couldn't set read_at, so chat-list
-- unread badges never came down and read receipts never flipped to "Read".
--
-- Broaden the UPDATE policy to also allow a conversation participant to update
-- a message they did NOT send (i.e. mark a received message read). The
-- recipient_id path is preserved for booking/DM-style rows.

drop policy if exists messages_update_recipient on public.messages;

create policy messages_update_recipient on public.messages
  for update
  using (
    auth.uid() = recipient_id
    or (
      conversation_id is not null
      and sender_id <> auth.uid()
      and public.is_conversation_participant(conversation_id, auth.uid())
    )
  )
  with check (
    auth.uid() = recipient_id
    or (
      conversation_id is not null
      and sender_id <> auth.uid()
      and public.is_conversation_participant(conversation_id, auth.uid())
    )
  );
