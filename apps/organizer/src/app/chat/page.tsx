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
  content: string;
  created_at: string;
};

export default function BookingChatListPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [lastMsgs, setLastMsgs] = useState<Record<string, BookingMessage | null>>({});
  const [loading, setLoading] = useState(true);

  // Load user + bookings
  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    if (!user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    // Fetch bookings where the user is either musician or organizer
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('*')
      .or(`musician_id.eq.${user.id},organizer_id.eq.${user.id}`)
      .order('id', { ascending: false });

    setBookings(bookingData ?? []);
    setLoading(false);

    // Fetch last message per booking
    if (bookingData && bookingData.length > 0) {
      const ids = bookingData.map((b) => b.id);

      const { data: msgData } = await supabase
        .from('booking_messages')
        .select('*')
        .in('booking_id', ids)
        .order('created_at', { ascending: false });

      const map: Record<string, BookingMessage | null> = {};

      // pick the latest for each booking
      ids.forEach((id) => {
        map[id] = (msgData ?? []).find((m) => m.booking_id === id) ?? null;
      });

      setLastMsgs(map);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <main className="p-6">Loading conversations…</main>;
  }

  const hasChats = bookings.length > 0;

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-4">
      <h1 className="text-xl font-semibold mb-4">Messages</h1>

      {!hasChats && (
        <p className="text-gray-500 text-sm">No chats yet. Book a musician or accept a booking to start a conversation.</p>
      )}

      <div className="space-y-3">
        {bookings.map((b) => {
          const last = lastMsgs[b.id];
          const isMusician = userId === b.musician_id;

          const otherName = isMusician
            ? b.organizer_name || b.organizer_email || 'Organizer'
            : 'Musician'; // if you add musician_name later, update this

          return (
            <Link
              key={b.id}
              href={`/bookings/${b.id}/chat`}
              className="block border rounded-xl p-4 hover:bg-gray-50 transition"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{otherName}</p>
                  {last ? (
                    <p className="text-sm text-gray-500 truncate max-w-[80%]">
                      {last.content}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">No messages yet</p>
                  )}
                </div>

                {last && (
                  <p className="text-xs text-gray-400">
                    {new Date(last.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
