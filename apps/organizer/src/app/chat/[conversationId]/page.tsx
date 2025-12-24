'use client';

import {
  useEffect,
  useRef,
  useState,
  useContext,
  useMemo,
  Fragment,
} from 'react';
import type { ChangeEvent } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';
import { PresenceContext } from '@arteve/shared/presence/provider';
import { useMarkNotificationAsRead } from '@arteve/shared/notifications/auto-read';

/* ----------------------------- Types ----------------------------- */

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

type Participant = {
  user_id: string;
  role: 'musician' | 'organizer';
};

type TypingBroadcast = {
  payload: {
    sender_id: string;
  };
};

/* ---------------------------------------------------------------- */

async function findExistingConversation(
  me: string,
  other: string
): Promise<string | null> {
  // get all my conversation IDs
  const { data: mine, error: e1 } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', me);

  if (e1) throw e1;
  if (!mine || mine.length === 0) return null;

  const myConversationIds = mine.map(r => r.conversation_id);

  // check if other user is in any of them
  const { data: match, error: e2 } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', other)
    .in('conversation_id', myConversationIds)
    .limit(1)
    .maybeSingle();

  if (e2) throw e2;
  return match?.conversation_id ?? null;
}

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherLabel, setOtherLabel] = useState<string>('Conversation');

  const { onlineUsers, lastSeen } = useContext(PresenceContext);

  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const [otherName, setOtherName] = useState<string>('Conversation');
  const [otherAvatar, setOtherAvatar] = useState<string | null>(null);

  // auto-read notifications
  const search = useSearchParams();
  const notifId = search.get('notification_id');
  useMarkNotificationAsRead(notifId);

  /* ------------------- Realtime channel ------------------- */
  const channel = useMemo(
    () =>
      supabase.channel(`conversation-chat-${conversationId}`, {
        config: { broadcast: { self: false } },
      }),
    [conversationId]
  );

  /* ------------------- Initial load ------------------- */
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      /* Messages */
      const { data: m } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      setMsgs(m ?? []);

      /* Participants */
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id, role')
        .eq('conversation_id', conversationId);

      if (participants && participants.length === 2) {
        const other = participants.find(p => p.user_id !== user.id);
        if (!other) return;

        setOtherUserId(other.user_id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, handle, avatar_url')
          .eq('id', other.user_id)
          .single();

        setOtherName(
          profile?.display_name ||
          (profile?.handle ? `@${profile.handle}` : 'Conversation')
        );

        setOtherAvatar(profile?.avatar_url ?? null);
      }

      /* Mark unread messages as read */
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .is('read_at', null);

      setLoading(false);
    })();
  }, [conversationId]);

  /* ------------------- Realtime listeners ------------------- */
  useEffect(() => {
    if (!userId) return;

  // New messages
  channel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    },
    async payload => {
      const msg = payload.new as Message;
      setMsgs(prev =>
        prev.some(m => m.id === msg.id) ? prev : [...prev, msg]
      );

      if (msg.sender_id !== userId && !msg.read_at) {
        await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .eq('id', msg.id);
      }
    }
  );

  // Typing indicator
  channel.on('broadcast', { event: 'typing' }, (msg: TypingBroadcast) => {
    const senderId = msg?.payload?.sender_id;
    if (!senderId || senderId === userId) return;

    setOtherTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 2000);
  });


    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channel, conversationId, userId]);

  /* ------------------- Auto scroll ------------------- */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  /* ------------------- Send message ------------------- */
  async function sendMessage() {
    if (!userId || !content.trim()) return;

    const text = content.trim();
    setContent('');

    // Optimistic insert that returns the inserted row
    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: text,
      })
      .select('*')
      .single();

    if (error) {
      // restore input if it fails
      setContent(text);
      console.error(error);
      return;
    }

    // ✅ Immediately show it without waiting for realtime
    setMsgs(prev =>
      prev.some(m => m.id === inserted.id) ? prev : [...prev, inserted]
    );
  }

  /* ------------------- Typing ------------------- */
  function handleTyping(e: ChangeEvent<HTMLInputElement>) {
    setContent(e.target.value);
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { sender_id: userId },
    });
  }

  if (loading) return <main className="p-6">Loading chat…</main>;

  const isOtherOnline =
    otherUserId != null ? !!onlineUsers[otherUserId] : false;

  const lastSeenText =
    otherUserId && lastSeen[otherUserId]
      ? new Date(lastSeen[otherUserId]).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'recently';

  let lastDateLabel = '';

  /* ========================== UI ========================== */
  return (
    <main className="w-full max-w-5xl mx-auto h-screen flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b sticky top-0 bg-white z-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-600"
        >
          ←
        </button>

        <div className="flex items-center gap-3">
          {otherAvatar ? (
            <img
              src={otherAvatar}
              className="w-9 h-9 rounded-full object-cover"
              alt=""
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
              {otherName.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold">{otherName}</p>
            <p className="text-xs text-gray-500">
              {isOtherOnline ? 'Active now' : `Last seen ${lastSeenText}`}
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {msgs.map(m => {
          const isMine = m.sender_id === userId;
          const date = new Date(m.created_at);
          const dateLabel = date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          const showDate = dateLabel !== lastDateLabel;
          if (showDate) lastDateLabel = dateLabel;

          return (
            <Fragment key={m.id}>
              {showDate && (
                <div className="text-center my-2">
                  <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-[11px] text-gray-500">
                    {dateLabel}
                  </span>
                </div>
              )}

              <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[72%] px-3 py-2 rounded-2xl text-sm ${
                    isMine
                      ? 'bg-black text-white rounded-br-sm'
                      : 'bg-gray-100 rounded-bl-sm'
                  }`}
                >
                  {m.content}
                  <div className="text-[10px] opacity-60 text-right mt-1">
                    {date.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            </Fragment>
          );
        })}

        {otherTyping && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
            Typing…
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={e => {
          e.preventDefault();
          sendMessage();
        }}
        className="px-3 pt-2 pb-8 border-t flex items-center gap-2"
      >
        <input
          className="flex-1 rounded-full bg-gray-100 px-4 py-2 text-sm"
          placeholder="Message…"
          value={content}
          onChange={handleTyping}
        />
        <button
          type="submit"
          disabled={!content.trim()}
          className="px-4 py-2 rounded-full bg-black text-white text-sm"
        >
          Send
        </button>
      </form>
    </main>
  );
}
