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
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';
import { PresenceContext } from '@arteve/shared/presence/provider';

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
  event_title: string | null;
  organizer_name: string | null;
  organizer_email: string | null;
  musician: {
    display_name: string | null;
  } | null;
};

export default function OrganizerBookingChatPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<BookingMessage[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherLabel, setOtherLabel] = useState<string>('Conversation');
  const [eventTitle, setEventTitle] = useState<string | null>(null);

  const { onlineUsers, lastSeen } = useContext(PresenceContext);

  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Shared realtime channel
  const channel = useMemo(
    () =>
      supabase.channel(`booking-chat-${bookingId}`, {
        config: { broadcast: { self: true } },
      }),
    [bookingId]
  );

  // Initial load: user, messages, booking info
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

      // Messages
      const { data: m } = await supabase
        .from('booking_messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      setMsgs(m ?? []);

      // Booking with musician profile for header label
      const { data: bookingRow } = await supabase
        .from('bookings')
        .select(
          `
          musician_id,
          organizer_id,
          event_title,
          organizer_name,
          organizer_email,
          musician:profiles!bookings_musician_id_fkey (
            display_name
          )
        `
        )
        .eq('id', bookingId)
        .maybeSingle<BookingHeaderRow>();

      if (bookingRow) {
        const isMusician = bookingRow.musician_id === user.id;
        const otherId = isMusician
          ? bookingRow.organizer_id
          : bookingRow.musician_id;

        setOtherUserId(otherId ?? null);
        setEventTitle(bookingRow.event_title ?? null);

        const label = isMusician
          ? bookingRow.organizer_name ||
            bookingRow.organizer_email ||
            'Organizer'
          : bookingRow.musician?.display_name || 'Musician';

        setOtherLabel(label);
      }

      // Mark unread messages as read for this user
      await supabase
        .from('booking_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('booking_id', bookingId)
        .eq('recipient_id', user.id)
        .is('read_at', null);

      setLoading(false);
    })();
  }, [bookingId]);

  // Realtime: new messages + typing
  useEffect(() => {
    if (!userId) return;

    // New messages
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'booking_messages',
        filter: `booking_id=eq.${bookingId}`,
      },
      async (payload) => {
        const msg = payload.new as BookingMessage;
        setMsgs((prev) => [...prev, msg]);

        if (msg.recipient_id === userId && !msg.read_at) {
          await supabase
            .from('booking_messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', msg.id);
        }
      }
    );

    // Typing indicator
    channel.on('broadcast', { event: 'typing' }, (payload) => {
      if (payload.sender_id !== userId) {
        setOtherTyping(true);

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
          setOtherTyping(false);
        }, 2000);
      }
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channel, bookingId, userId]);

  // Auto scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  // Send message
  async function sendMessage() {
    if (!userId || !content.trim()) return;

    const { data: booking } = await supabase
      .from('bookings')
      .select('musician_id, organizer_id')
      .eq('id', bookingId)
      .maybeSingle<{ musician_id: string; organizer_id: string }>();

    if (!booking) return;

    const recipientId =
      booking.musician_id === userId
        ? booking.organizer_id
        : booking.musician_id;

    await supabase.from('booking_messages').insert({
      booking_id: bookingId,
      sender_id: userId,
      recipient_id: recipientId,
      content: content.trim(),
    });

    setContent('');
  }

  // Typing event
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

  // Date separators
  let lastDateLabel = '';

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 h-[calc(100vh-4rem)] flex flex-col bg-white">
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
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
            {otherLabel.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {otherLabel}
            </p>
            <p className="text-xs text-gray-500">
              {isOtherOnline
                ? 'Active now'
                : `Last seen ${lastSeenText}`}
            </p>
          </div>
        </div>
      </header>

      {eventTitle && (
        <div className="px-4 pt-2 text-[11px] text-gray-500">
          Booking: {eventTitle}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {msgs.map((m) => {
          const isMine = m.sender_id === userId;
          const date = new Date(m.created_at);

          const dateLabel = date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          const showDate = dateLabel !== lastDateLabel;
          if (showDate) {
            lastDateLabel = dateLabel;
          }

          return (
            <Fragment key={m.id}>
              {showDate && (
                <div className="text-center my-2">
                  <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-[11px] text-gray-500">
                    {dateLabel}
                  </span>
                </div>
              )}

              <div
                className={`flex ${
                  isMine ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[72%] px-3 py-2 rounded-2xl text-sm leading-snug ${
                    isMine
                      ? 'bg-black text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
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
          <div className="px-2 text-xs italic text-gray-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
            Typing…
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="px-3 py-2 border-t flex items-center gap-2 bg-white"
      >
        <input
          className="flex-1 rounded-full bg-gray-100 px-4 py-2 text-sm outline-none"
          placeholder="Message…"
          value={content}
          onChange={handleTyping}
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-full bg-black text-white text-sm disabled:opacity-60"
          disabled={!content.trim()}
        >
          Send
        </button>
      </form>
    </main>
  );
}
