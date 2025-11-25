'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';

type Booking = {
  id: string;
  musician_id: string;
  organizer_id: string;
  organizer_name: string | null;
  organizer_email: string | null;
};

type BookingMessage = {
  id: string;
  booking_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

export default function BookingChatListPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [lastMsgs, setLastMsgs] = useState<Record<string, BookingMessage | null>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Load bookings + last messages + unread counts
  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const uid = user.id;
    setUserId(uid);

    // Fetch bookings where user is musician OR organizer
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('*')
      .or(`musician_id.eq.${uid},organizer_id.eq.${uid}`)
      .order('id', { ascending: false });

    if (!bookingData) return;

    setBookings(bookingData);
    const ids = bookingData.map((b) => b.id);

    if (!ids.length) {
      setLoading(false);
      return;
    }

    // Fetch messages (latest first)
    const { data: msgData } = await supabase
      .from('booking_messages')
      .select('*')
      .in('booking_id', ids)
      .order('created_at', { ascending: false });

    const lastMap: Record<string, BookingMessage | null> = {};
    const unreadMap: Record<string, number> = {};

    // Build last message + unread count per booking
    ids.forEach((id) => {
      lastMap[id] = msgData?.find((m) => m.booking_id === id) ?? null;
      unreadMap[id] = msgData?.filter(
        (m) => m.booking_id === id && m.recipient_id === uid && m.read_at === null
      ).length ?? 0;
    });

    setLastMsgs(lastMap);
    setUnreadCounts(unreadMap);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // REAL-TIME listeners
  useEffect(() => {
    if (!userId) return;

    // 1️⃣ Listener for NEW messages (INSERT)
    const insertChannel = supabase
      .channel('booking-messages-insert')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_messages',
        },
        (payload) => {
          const msg = payload.new as BookingMessage;

          // Update last message
          setLastMsgs((prev) => ({
            ...prev,
            [msg.booking_id]: msg,
          }));

          // If message is for this user, increment unread count
          if (msg.recipient_id === userId) {
            setUnreadCounts((prev) => ({
              ...prev,
              [msg.booking_id]: (prev[msg.booking_id] ?? 0) + 1,
            }));
          }
        }
      )
      .subscribe();

    // 2️⃣ Listener for message UPDATES (read receipts)
    const updateChannel = supabase
      .channel('booking-messages-update')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'booking_messages',
        },
        (payload) => {
          const msg = payload.new as BookingMessage;

          // If this user is the recipient and message was read
          if (msg.recipient_id === userId && msg.read_at) {
            setUnreadCounts((prev) => ({
              ...prev,
              [msg.booking_id]: Math.max((prev[msg.booking_id] ?? 1) - 1, 0),
            }));
          }

          // If updated message is the newest, update preview
          setLastMsgs((prev) => {
            const old = prev[msg.booking_id];
            if (!old || new Date(msg.created_at) > new Date(old.created_at)) {
              return {
                ...prev,
                [msg.booking_id]: msg,
              };
            }
            return prev;
          });
        }
      )
      .subscribe();

    // 3️⃣ Listener for NEW bookings
    const bookingChannel = supabase
      .channel('booking-insert')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          const booking = payload.new as Booking;

          // Only add if this user is involved
          if (
            booking.musician_id === userId ||
            booking.organizer_id === userId
          ) {
            setBookings((prev) => [booking, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(insertChannel);
      supabase.removeChannel(updateChannel);
      supabase.removeChannel(bookingChannel);
    };
  }, [userId]);

  if (loading) {
    return <main className="p-6">Loading conversations…</main>;
  }

  const hasChats = bookings.length > 0;

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-4">
      <h1 className="text-xl font-semibold mb-4">Messages</h1>

      {!hasChats && (
        <p className="text-gray-500 text-sm">
          No chats yet.
        </p>
      )}

      <div className="space-y-3">
        {bookings.map((b) => {
          const last = lastMsgs[b.id];
          const unread = unreadCounts[b.id] ?? 0;

          const otherName =
            userId === b.musician_id
              ? b.organizer_name || b.organizer_email || 'Organizer'
              : 'Musician'; // update when musician name added

          return (
            <Link
              key={b.id}
              href={`/bookings/${b.id}/chat`}
              className="block border rounded-xl p-4 hover:bg-gray-50 transition"
            >
              <div className="flex justify-between items-center">
                <div className="min-w-0">
                  <p className="font-medium">{otherName}</p>

                  {last ? (
                    <p
                      className={`text-sm truncate max-w-[80%] ${
                        unread > 0 ? 'text-gray-800 font-semibold' : 'text-gray-500'
                      }`}
                    >
                      {last.content}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">No messages yet</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1">
                  {last && (
                    <p className="text-xs text-gray-400">
                      {new Date(last.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}

                  {unread > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 rounded-full bg-red-500 text-white text-xs">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
