'use client';

import { useEffect, useRef, useState, useContext, useMemo } from 'react';
import { useParams } from 'next/navigation';
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

export default function OrganizerBookingChatPage() {
  const { bookingId } = useParams<{ bookingId: string }>();

  const [userId, setUserId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<BookingMessage[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);

  const { onlineUsers, lastSeen } = useContext(PresenceContext);

  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // 👉 SINGLE SHARED REALTIME CHANNEL (critical fix)
  const channel = useMemo(() => {
    return supabase.channel(`booking-chat-${bookingId}`, {
      config: { broadcast: { self: true } }
    });
  }, [bookingId]);

  // Load initial data
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      // Fetch all messages
      const { data: m } = await supabase
        .from('booking_messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      setMsgs(m ?? []);

      // Get the two participants
      const { data: booking } = await supabase
        .from('bookings')
        .select('musician_id, organizer_id')
        .eq('id', bookingId)
        .single();

      if (booking) {
        setOtherUserId(
          booking.musician_id === user.id
            ? booking.organizer_id
            : booking.musician_id
        );
      }

      // Mark unread messages as read
      await supabase
        .from('booking_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('booking_id', bookingId)
        .eq('recipient_id', user.id)
        .is('read_at', null);

      setLoading(false);
    })();
  }, [bookingId]);

  // Realtime listener (shared channel)
  useEffect(() => {
    if (!userId) return;

    // 🔵 New messages
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'booking_messages',
        filter: `booking_id=eq.${bookingId}`
      },
      async (payload) => {
        const msg = payload.new as BookingMessage;
        setMsgs(prev => [...prev, msg]);

        // Mark as read if the message is for this user
        if (msg.recipient_id === userId && !msg.read_at) {
          await supabase
            .from('booking_messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', msg.id);
        }
      }
    );

    // 🔴 Typing indicator
    channel.on(
      'broadcast',
      { event: 'typing' },
      (payload) => {
        if (payload.sender_id !== userId) {
          setOtherTyping(true);

          if (typingTimeoutRef.current)
            clearTimeout(typingTimeoutRef.current);

          typingTimeoutRef.current = setTimeout(() => {
            setOtherTyping(false);
          }, 2000);
        }
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channel, bookingId, userId]);

  // Auto scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  async function sendMessage() {
    if (!userId || !content.trim()) return;

    const { data: booking } = await supabase
      .from('bookings')
      .select('musician_id, organizer_id')
      .eq('id', bookingId)
      .single();

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

  function handleTyping(e: React.ChangeEvent<HTMLInputElement>) {
    setContent(e.target.value);

    // Use the SAME channel instance
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { sender_id: userId },
    });
  }

  if (loading) return <main className="p-6">Loading chat…</main>;

  return (
    <main className="mx-auto max-w-2xl p-6 flex flex-col min-h-[calc(100vh-4rem)]">

      {/* Online status */}
      <div className="px-2 pb-3 text-sm text-gray-600 flex items-center gap-2">
        {otherUserId && onlineUsers[otherUserId] ? (
          <>
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Online now
          </>
        ) : (
          <>
            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
            Last seen{' '}
            {otherUserId && lastSeen[otherUserId]
              ? new Date(lastSeen[otherUserId]).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'recently'}
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {msgs.map((m) => {
          const isMine = m.sender_id === userId;
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                  isMine ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {m.content}
                <div className="text-[10px] opacity-60 text-right mt-1">
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {otherTyping && (
          <div className="px-2 text-sm italic text-gray-500">Typing…</div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="flex gap-2 border-t pt-2"
      >
        <input
          className="flex-1 border rounded-full px-3 py-2"
          placeholder="Type a message…"
          value={content}
          onChange={handleTyping}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-full"
        >
          Send
        </button>
      </form>

    </main>
  );
}
