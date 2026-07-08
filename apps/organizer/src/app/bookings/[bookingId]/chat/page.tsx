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
import { Button } from '@arteve/ui/components';

type BookingMessage = {
  id: string;
  booking_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

type BookingHeaderRow = {
  musician_id: string;
  organizer_id: string;
  organizer_name: string | null;
  organizer_email: string | null;
  event_title: string | null;
};

export default function MusicianBookingChatPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<BookingMessage[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherLabel, setOtherLabel] = useState<string>('Conversation');
  const [eventTitle, setEventTitle] = useState<string | null>(null);

  const { onlineUsers, lastSeen } = useContext(PresenceContext);

  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const search = useSearchParams();
  useMarkNotificationAsRead(search.get('notification_id'));

  const channel = useMemo(
    () =>
      supabase.channel(`booking-chat-${bookingId}`, {
        config: { broadcast: { self: false } },
      }),
    [bookingId]
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
        .from('booking_messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });
      setMsgs(m ?? []);

      const { data: bookingRow } = await supabase
        .from('bookings')
        .select(`musician_id, organizer_id, organizer_name, organizer_email, event_title`)
        .eq('id', bookingId)
        .maybeSingle<BookingHeaderRow>();

      if (bookingRow) {
        const isMusician = bookingRow.musician_id === user.id;
        const otherId = isMusician ? bookingRow.organizer_id : bookingRow.musician_id;
        setOtherUserId(otherId ?? null);
        const label = isMusician
          ? bookingRow.organizer_name || bookingRow.organizer_email || 'Organizer'
          : 'Musician';
        setOtherLabel(label);
        setEventTitle(bookingRow.event_title ?? null);
      }

      await supabase
        .from('booking_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('booking_id', bookingId)
        .eq('recipient_id', user.id)
        .is('read_at', null);

      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('booking_id', bookingId)
        .maybeSingle<{ id: string }>();
      if (conv?.id) setConversationId(conv.id);

      setLoading(false);
    })();
  }, [bookingId]);

  useEffect(() => {
    if (!userId || !conversationId) return;
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        const row = payload.new as {
          id: string; sender_id: string; recipient_id: string;
          content: string; created_at: string; read_at: string | null;
        };
        const msg: BookingMessage = { ...row, booking_id: bookingId };
        setMsgs((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        if (msg.recipient_id === userId && !msg.read_at) {
          await supabase
            .from('booking_messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', msg.id);
        }
      }
    );

    channel.on('broadcast', { event: 'typing' }, (msg: { payload: { sender_id: string } }) => {
      const senderId = msg?.payload?.sender_id;
      if (!senderId || senderId === userId) return;
      setOtherTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 2000);
    });

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [channel, bookingId, userId, conversationId]);

  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    const stream = endRef.current?.parentElement;
    if (!stream) return;
    // Jump instantly on first paint (a smooth scroll mid-mount is flaky and
    // long threads would open at the oldest message), then glide for
    // messages that arrive while the thread is open.
    stream.scrollTo({
      top: stream.scrollHeight,
      behavior: didInitialScrollRef.current ? 'smooth' : 'auto',
    });
    didInitialScrollRef.current = true;
  }, [msgs, otherTyping]);

  async function sendMessage() {
    if (!userId || !content.trim()) return;
    const text = content.trim();
    setContent('');
    const { data: booking } = await supabase
      .from('bookings')
      .select('musician_id, organizer_id')
      .eq('id', bookingId)
      .maybeSingle<{ musician_id: string; organizer_id: string }>();
    if (!booking) { setContent(text); return; }
    const recipientId = booking.musician_id === userId ? booking.organizer_id : booking.musician_id;
    const { data: inserted, error } = await supabase
      .from('booking_messages')
      .insert({ booking_id: bookingId, sender_id: userId, recipient_id: recipientId, content: text })
      .select('*').single();
    if (error) { setContent(text); console.error(error); return; }
    setMsgs((prev) => (prev.some((m) => m.id === inserted.id) ? prev : [...prev, inserted]));
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

        <div className="avatar avatar-md inline-flex items-center justify-center bg-brand-100 text-brand-700 text-sm font-semibold">
          {otherLabel.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-strong truncate">{otherLabel}</p>
          <p className="text-xs flex items-center gap-1.5 text-ink-subtle">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${isOtherOnline ? 'bg-success' : 'bg-ink-disabled'}`} />
            {isOtherOnline ? 'Active now' : `Last seen ${lastSeenText}`}
          </p>
        </div>
      </header>

      {eventTitle && (
        <div className="px-4 py-2 text-[11px] text-ink-subtle border-b border-line bg-surface">
          Booking: <span className="font-medium text-ink">{eventTitle}</span>
        </div>
      )}

      <div className="chat-stream">
        {msgs.length === 0 && (
          <div className="text-center text-sm text-ink-subtle py-12">
            Start the conversation about this booking.
          </div>
        )}
        {msgs.map((m) => {
          const isMine = m.sender_id === userId;
          const date = new Date(m.created_at);
          const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          const showDate = dateLabel !== lastDateLabel;
          if (showDate) lastDateLabel = dateLabel;
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
            </Fragment>
          );
        })}
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
        <Button type="submit" disabled={!content.trim()}>Send</Button>
      </form>
    </main>
  );
}
