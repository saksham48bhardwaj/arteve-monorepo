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
  event_title: string | null;
  event_date: string | null;
  location: string | null;
  musician_name: string | null;
  musician_avatar_url: string | null;
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

export default function OrganizerBookingChatListPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [lastMsgs, setLastMsgs] = useState<
    Record<string, BookingMessage | null>
  >({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Load bookings + last messages + unread counts
  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserId(null);
      setBookings([]);
      setLastMsgs({});
      setUnreadCounts({});
      setLoading(false);
      return;
    }

    const uid = user.id;
    setUserId(uid);

    // Fetch bookings where this user is involved (organizer, but keep it future proof)
    const { data: bookingData, error: bookingErr } = await supabase
      .from('bookings')
      .select(
        `
        id,
        musician_id,
        organizer_id,
        organizer_name,
        organizer_email,
        event_title,
        event_date,
        location,
        profiles:profiles!bookings_musician_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `
      )
      .or(`musician_id.eq.${uid},organizer_id.eq.${uid}`)
      .order('id', { ascending: false });

    if (bookingErr || !bookingData) {
      console.error('Error loading bookings:', bookingErr);
      setBookings([]);
      setLastMsgs({});
      setUnreadCounts({});
      setLoading(false);
      return;
    }

    const mappedBookings: Booking[] = bookingData.map((row) => {
      const musicianProfile = Array.isArray(row.profiles)
        ? row.profiles[0]
        : row.profiles;

      return {
        id: row.id,
        musician_id: row.musician_id,
        organizer_id: row.organizer_id,
        organizer_name: row.organizer_name,
        organizer_email: row.organizer_email,
        event_title: row.event_title ?? null,
        event_date: row.event_date ?? null,
        location: row.location ?? null,
        musician_name: musicianProfile?.display_name ?? 'Musician',
        musician_avatar_url: musicianProfile?.avatar_url ?? null,
      };
    });

    setBookings(mappedBookings);

    const ids = mappedBookings.map((b) => b.id);

    if (!ids.length) {
      setLastMsgs({});
      setUnreadCounts({});
      setLoading(false);
      return;
    }

    // Fetch messages (latest first)
    const { data: msgData, error: msgErr } = await supabase
      .from('booking_messages')
      .select('*')
      .in('booking_id', ids)
      .order('created_at', { ascending: false });

    if (msgErr) {
      console.error('Error loading messages:', msgErr);
      setLastMsgs({});
      setUnreadCounts({});
      setLoading(false);
      return;
    }

    const lastMap: Record<string, BookingMessage | null> = {};
    const unreadMap: Record<string, number> = {};

    ids.forEach((id) => {
      const msgsForBooking = (msgData ?? []).filter(
        (m) => m.booking_id === id
      ) as BookingMessage[];
      lastMap[id] = msgsForBooking[0] ?? null;
      unreadMap[id] =
        msgsForBooking.filter(
          (m) => m.recipient_id === uid && m.read_at === null
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

    // New messages
    const insertChannel = supabase
      .channel('booking-messages-insert-organizer')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_messages',
        },
        (payload) => {
          const msg = payload.new as BookingMessage;

          // Update last message for that booking
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

    // Message updates (read_at changes)
    const updateChannel = supabase
      .channel('booking-messages-update-organizer')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'booking_messages',
        },
        (payload) => {
          const msg = payload.new as BookingMessage;

          // If this user is the recipient and message now has read_at -> reduce unread
          if (msg.recipient_id === userId && msg.read_at) {
            setUnreadCounts((prev) => ({
              ...prev,
              [msg.booking_id]: Math.max((prev[msg.booking_id] ?? 1) - 1, 0),
            }));
          }

          // Update last message preview if this is newer
          setLastMsgs((prev) => {
            const current = prev[msg.booking_id];
            if (!current) {
              return { ...prev, [msg.booking_id]: msg };
            }

            if (
              new Date(msg.created_at).getTime() >
              new Date(current.created_at).getTime()
            ) {
              return { ...prev, [msg.booking_id]: msg };
            }
            return prev;
          });
        }
      )
      .subscribe();

    // New bookings
    const bookingChannel = supabase
      .channel('booking-insert-organizer')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          const booking = payload.new as Booking;

          if (
            booking.musician_id === userId ||
            booking.organizer_id === userId
          ) {
            // Reload everything so joins + last messages stay correct
            load();
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
          No chats yet. Create a gig and accept a musician to start a
          conversation.
        </p>
      )}

      <div className="space-y-3">
        {bookings.map((b) => {
          const last = lastMsgs[b.id];
          const unread = unreadCounts[b.id] ?? 0;

          const isMusician = userId === b.musician_id;
          const otherName = isMusician
            ? b.organizer_name || b.organizer_email || 'Organizer'
            : b.musician_name || 'Musician';

          const subtitle = b.event_title
            ? b.event_title
            : b.event_date
            ? new Date(b.event_date).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : null;

          return (
            <Link
              key={b.id}
              href={`/bookings/${b.id}/chat`}
              className="block border rounded-xl p-4 hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                    {b.musician_avatar_url ? (
                      <img
                        src={b.musician_avatar_url}
                        alt={otherName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                        {otherName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {otherName}
                  </p>

                  {subtitle && (
                    <p className="text-xs text-gray-500 truncate">
                      {subtitle}
                    </p>
                  )}

                  {last ? (
                    <p
                      className={`text-sm truncate ${
                        unread > 0
                          ? 'text-gray-800 font-semibold'
                          : 'text-gray-500'
                      }`}
                    >
                      {last.content}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">
                      No messages yet
                    </p>
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
