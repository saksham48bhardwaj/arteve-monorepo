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
import { sendNotification } from '@arteve/shared/notifications';
import { Avatar, Button } from '@arteve/ui/components';

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

type TypingBroadcast = {
  payload: { sender_id: string };
};

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherName, setOtherName] = useState<string>('Conversation');
  const [otherAvatar, setOtherAvatar] = useState<string | null>(null);

  const { onlineUsers, lastSeen } = useContext(PresenceContext);
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const search = useSearchParams();
  useMarkNotificationAsRead(search.get('notification_id'));

  const channel = useMemo(
    () =>
      supabase.channel(`conversation-chat-${conversationId}`, {
        config: { broadcast: { self: false } },
      }),
    [conversationId]
  );

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data: m } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      setMsgs(m ?? []);

      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id, role')
        .eq('conversation_id', conversationId);

      if (participants && participants.length === 2) {
        const other = participants.find((p) => p.user_id !== user.id);
        if (other) {
          setOtherUserId(other.user_id);
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, handle, avatar_url')
            .eq('id', other.user_id)
            .single();
          setOtherName(
            profile?.display_name ||
              (profile?.handle ? `@${profile.handle}` : 'Conversation'),
          );
          setOtherAvatar(profile?.avatar_url ?? null);
        }
      }

      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .is('read_at', null);

      setLoading(false);
    })();
  }, [conversationId]);

  useEffect(() => {
    if (!userId) return;
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        const msg = payload.new as Message;
        setMsgs((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        if (msg.sender_id !== userId && !msg.read_at) {
          await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', msg.id);
        }
      },
    );

    channel.on('broadcast', { event: 'typing' }, (msg: TypingBroadcast) => {
      const senderId = msg?.payload?.sender_id;
      if (!senderId || senderId === userId) return;
      setOtherTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 2000);
    });

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [channel, conversationId, userId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, otherTyping]);

  async function sendMessage() {
    if (!userId || !content.trim()) return;
    const text = content.trim();
    setContent('');
    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: userId, content: text })
      .select('*')
      .single();
    if (error) {
      setContent(text);
      console.error(error);
      return;
    }
    setMsgs((prev) => (prev.some((m) => m.id === inserted.id) ? prev : [...prev, inserted]));

    if (otherUserId) {
      sendNotification({
        userId: otherUserId,
        type: 'new_message',
        body: text.length > 80 ? `${text.slice(0, 80)}…` : text,
        data: { conversation_id: conversationId },
      });
    }
  }

  function handleTyping(e: ChangeEvent<HTMLInputElement>) {
    setContent(e.target.value);
    channel.send({ type: 'broadcast', event: 'typing', payload: { sender_id: userId } });
  }

  if (loading) {
    return (
      <main className="chat-shell">
        <header className="chat-header">
          <div className="h-9 w-9 skeleton rounded-full" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-3 w-32" />
            <div className="skeleton h-2.5 w-20" />
          </div>
        </header>
        <div className="chat-stream" />
      </main>
    );
  }

  const isOtherOnline = otherUserId != null ? !!onlineUsers[otherUserId] : false;
  const lastSeenText =
    otherUserId && lastSeen[otherUserId]
      ? new Date(lastSeen[otherUserId]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'recently';

  let lastDateLabel = '';

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <button type="button" onClick={() => router.back()} className="chat-back-btn" aria-label="Back">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <Avatar src={otherAvatar} alt={otherName} size="md" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-strong truncate">{otherName}</p>
          <p className="text-xs flex items-center gap-1.5 text-ink-subtle">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${isOtherOnline ? 'bg-success' : 'bg-ink-disabled'}`} />
            {isOtherOnline ? 'Active now' : `Last seen ${lastSeenText}`}
          </p>
        </div>
      </header>

      <div className="chat-stream">
        {msgs.length === 0 && (
          <div className="text-center text-sm text-ink-subtle py-12">
            No messages yet — say hello.
          </div>
        )}
        {(() => {
          let lastMineIdx = -1;
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].sender_id === userId) { lastMineIdx = i; break; }
          }
          return msgs.map((m, idx) => {
            const isMine = m.sender_id === userId;
            const date = new Date(m.created_at);
            const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            const showDate = dateLabel !== lastDateLabel;
            if (showDate) lastDateLabel = dateLabel;
            const isLastMine = isMine && idx === lastMineIdx;
            return (
              <Fragment key={m.id}>
                {showDate && (
                  <div className="chat-day-divider"><span>{dateLabel}</span></div>
                )}
                <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`chat-bubble ${isMine ? 'chat-bubble-mine' : 'chat-bubble-theirs'}`}>
                    {m.content}
                    <div className={isMine ? 'chat-meta-mine' : 'chat-meta-theirs'}>
                      {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                {isLastMine && (
                  <div className="flex justify-end px-1 -mt-1 mb-1">
                    <span className="text-[11px] text-ink-subtle flex items-center gap-1">
                      {m.read_at ? (
                        <>
                          <svg viewBox="0 0 24 24" className="h-3 w-3 text-brand" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12l5 5L17 6" />
                            <path d="M8 17l9-9" />
                          </svg>
                          Read
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12l5 5L20 7" />
                          </svg>
                          Sent
                        </>
                      )}
                    </span>
                  </div>
                )}
              </Fragment>
            );
          });
        })()}
        {otherTyping && (
          <div className="chat-typing">
            <span className="chat-typing-dot animate-bounce [animation-delay:-0.3s]" />
            <span className="chat-typing-dot animate-bounce [animation-delay:-0.15s]" />
            <span className="chat-typing-dot animate-bounce" />
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
        className="chat-input-bar"
      >
        <input
          className="chat-input"
          placeholder="Message…"
          value={content}
          onChange={handleTyping}
        />
        <Button type="submit" disabled={!content.trim()} size="md">
          Send
        </Button>
      </form>
    </main>
  );
}
