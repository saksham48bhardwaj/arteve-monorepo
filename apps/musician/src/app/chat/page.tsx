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

export default function MusicianChatListPage() {
  const [userId, setUserId] = useState<string | null>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [lastMsgs, setLastMsgs] = useState<Record<string, BookingMessage | null>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // LOAD BOOKINGS + LAST MSGS + UNREAD COUNTS
  async function load() {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return;

    setUserId(user.id);

    // KEEP your working query
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('*')
      .eq('musician_id', user.id)
      .order('created_at', { ascending: false });

    setBookings(bookingData ?? []);

    const ids = bookingData?.map((b) => b.id) ?? [];

    if (ids.length === 0) {
      setLastMsgs({});
      setUnreadCounts({});
      setLoading(false);
      return;
    }

    // load messages
    const { data: msgData } = await supabase
      .from('booking_messages')
      .select('*')
      .in('booking_id', ids)
      .order('created_at', { ascending: false });

    const lastMap: Record<string, BookingMessage | null> = {};
    const unreadMap: Record<string, number> = {};

    ids.forEach((id) => {
      const msgs = msgData?.filter((m) => m.booking_id === id) ?? [];
      lastMap[id] = msgs[0] ?? null;
      unreadMap[id] = msgs.filter((m) => m.recipient_id === user.id && m.read_at === null).length;
    });

    setLastMsgs(lastMap);
    setUnreadCounts(unreadMap);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // REAL-TIME LISTENERS (safe)
  useEffect(() => {
    if (!userId) return;

    const insertChannel = supabase
      .channel('msg-insert-musician')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'booking_messages' },
        (payload) => {
          const msg = payload.new as BookingMessage;

          setLastMsgs((prev) => ({
            ...prev,
            [msg.booking_id]: msg,
          }));

          if (msg.recipient_id === userId) {
            setUnreadCounts((prev) => ({
              ...prev,
              [msg.booking_id]: (prev[msg.booking_id] ?? 0) + 1,
            }));
          }
        }
      )
      .subscribe();

    const updateChannel = supabase
      .channel('msg-update-musician')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'booking_messages' },
        (payload) => {
          const msg = payload.new as BookingMessage;

          if (msg.recipient_id === userId && msg.read_at) {
            setUnreadCounts((prev) => ({
              ...prev,
              [msg.booking_id]: Math.max((prev[msg.booking_id] ?? 1) - 1, 0),
            }));
          }

          setLastMsgs((prev) => {
            const old = prev[msg.booking_id];
            if (!old || new Date(msg.created_at) > new Date(old.created_at))
              return { ...prev, [msg.booking_id]: msg };
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(insertChannel);
      supabase.removeChannel(updateChannel);
    };
  }, [userId]);

  if (loading) return <main className="p-6">Loading…</main>;

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      <h1 className="text-xl font-semibold mb-4">Messages</h1>

      {bookings.length === 0 && (
        <p className="text-gray-500 text-sm">No conversations yet.</p>
      )}

      <div className="space-y-3">
        {bookings.map((b) => {
          const last = lastMsgs[b.id];
          const unread = unreadCounts[b.id] ?? 0;

          const otherName =
            b.organizer_name || b.organizer_email || 'Organizer';

          return (
            <Link
              key={b.id}
              href={`/bookings/${b.id}/chat`}
              className="block border rounded-xl p-4 hover:bg-gray-50 transition"
            >
              <div className="flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <p className={`font-medium truncate ${unread > 0 ? 'font-semibold' : ''}`}>
                    {otherName}
                  </p>

                  {last ? (
                    <p
                      className={`text-sm truncate ${
                        unread > 0 ? 'text-gray-800 font-semibold' : 'text-gray-500'
                      }`}
                    >
                      {last.content}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">No messages yet</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
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
