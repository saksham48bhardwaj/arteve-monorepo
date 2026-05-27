'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import {
  Page,
  PageHeader,
  EmptyState,
  Button,
  Avatar,
  Skeleton,
  usePullToRefresh,
  PullToRefreshIndicator,
} from '@arteve/ui/components';

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

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 1 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function OrganizerBookingChatListPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [lastMsgs, setLastMsgs] = useState<Record<string, BookingMessage | null>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
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

    const { data: bookingData, error: bookingErr } = await supabase
      .from('bookings')
      .select(`
        id, musician_id, organizer_id, organizer_name, organizer_email,
        event_title, event_date, location,
        profiles:profiles!bookings_musician_id_fkey ( id, display_name, avatar_url )
      `)
      .or(`musician_id.eq.${uid},organizer_id.eq.${uid}`)
      .order('id', { ascending: false });

    if (bookingErr || !bookingData) {
      setBookings([]); setLastMsgs({}); setUnreadCounts({}); setLoading(false);
      return;
    }

    const mappedBookings: Booking[] = bookingData.map((row) => {
      const musicianProfile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
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
    if (!ids.length) { setLastMsgs({}); setUnreadCounts({}); setLoading(false); return; }

    const { data: msgData } = await supabase
      .from('booking_messages')
      .select('*')
      .in('booking_id', ids)
      .order('created_at', { ascending: false });

    const lastMap: Record<string, BookingMessage | null> = {};
    const unreadMap: Record<string, number> = {};
    ids.forEach((id) => {
      const ms = (msgData ?? []).filter((m) => m.booking_id === id) as BookingMessage[];
      lastMap[id] = ms[0] ?? null;
      unreadMap[id] = ms.filter((m) => m.recipient_id === uid && m.read_at === null).length ?? 0;
    });
    setLastMsgs(lastMap);
    setUnreadCounts(unreadMap);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!userId) return;

    const insertChannel = supabase
      .channel('booking-messages-insert-organizer')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'booking_messages' }, (payload) => {
        const msg = payload.new as BookingMessage;
        setLastMsgs((prev) => ({ ...prev, [msg.booking_id]: msg }));
        if (msg.recipient_id === userId) {
          setUnreadCounts((prev) => ({ ...prev, [msg.booking_id]: (prev[msg.booking_id] ?? 0) + 1 }));
        }
      }).subscribe();

    const updateChannel = supabase
      .channel('booking-messages-update-organizer')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'booking_messages' }, (payload) => {
        const msg = payload.new as BookingMessage;
        if (msg.recipient_id === userId && msg.read_at) {
          setUnreadCounts((prev) => ({ ...prev, [msg.booking_id]: Math.max((prev[msg.booking_id] ?? 1) - 1, 0) }));
        }
        setLastMsgs((prev) => {
          const cur = prev[msg.booking_id];
          if (!cur || new Date(msg.created_at).getTime() > new Date(cur.created_at).getTime()) {
            return { ...prev, [msg.booking_id]: msg };
          }
          return prev;
        });
      }).subscribe();

    const bookingChannel = supabase
      .channel('booking-insert-organizer')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (payload) => {
        const booking = payload.new as Booking;
        if (booking.musician_id === userId || booking.organizer_id === userId) load();
      }).subscribe();

    return () => {
      supabase.removeChannel(insertChannel);
      supabase.removeChannel(updateChannel);
      supabase.removeChannel(bookingChannel);
    };
  }, [userId]);

  const pull = usePullToRefresh({ onRefresh: load });

  return (
    <Page>
      <PullToRefreshIndicator {...pull} />
      <PageHeader
        title="Messages"
        subtitle="Conversations with musicians about your bookings."
      />

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card card-padded flex items-center gap-3">
              <Skeleton shape="circle" width={40} height={40} />
              <div className="flex-1 space-y-2">
                <Skeleton width="40%" height={12} />
                <Skeleton width="65%" height={10} />
              </div>
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z" />
            </svg>
          }
          title="No chats yet"
          description="Post a gig or send a booking request, and conversations show up here."
          action={
            <Link href="/gigs/create">
              <Button>Create a gig</Button>
            </Link>
          }
        />
      ) : (
        <ul className="card divide-y divide-line p-0 overflow-hidden">
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
              ? new Date(b.event_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
              : null;

            return (
              <li key={b.id}>
                <Link
                  href={`/bookings/${b.id}/chat`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-sunken transition"
                >
                  {b.musician_avatar_url ? (
                    <Avatar src={b.musician_avatar_url} alt={otherName} size="md" />
                  ) : (
                    <div className="avatar avatar-md inline-flex items-center justify-center bg-brand-100 text-brand-700 text-sm font-semibold">
                      {otherName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-sm ${unread > 0 ? 'font-semibold text-ink-strong' : 'font-medium text-ink-strong'}`}>
                        {otherName}
                      </p>
                      {last && (
                        <span className="text-[11px] text-ink-subtle shrink-0">
                          {formatTime(last.created_at)}
                        </span>
                      )}
                    </div>
                    {subtitle && (
                      <p className="text-[11px] text-ink-subtle truncate mt-0.5">{subtitle}</p>
                    )}
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p
                        className={`truncate text-xs ${
                          unread > 0 ? 'text-ink font-medium' : 'text-ink-subtle'
                        }`}
                      >
                        {last ? last.content : 'No messages yet'}
                      </p>
                      {unread > 0 && (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-semibold text-white shrink-0">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
