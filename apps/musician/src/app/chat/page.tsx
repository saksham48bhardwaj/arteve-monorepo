'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import { Page, PageHeader, EmptyState, Button, Avatar, Skeleton } from '@arteve/ui/components';

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

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 1 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays < 7) {
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function MusicianChatListPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [lastMsgs, setLastMsgs] = useState<Record<string, BookingMessage | null>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

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

  useEffect(() => {
    if (!userId) return;

    const insertChannel = supabase
      .channel('msg-insert-musician')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'booking_messages' },
        (payload) => {
          const msg = payload.new as BookingMessage;
          setLastMsgs((prev) => ({ ...prev, [msg.booking_id]: msg }));
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

  return (
    <Page>
      <PageHeader
        title="Messages"
        subtitle="Conversations with organizers about your bookings."
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
          title="No conversations yet"
          description="When an organizer books you (or you apply to a gig and get a reply), your chats show up here."
          action={
            <Link href="/find?tab=gigs">
              <Button>Find a gig to apply to</Button>
            </Link>
          }
        />
      ) : (
        <ul className="card divide-y divide-line p-0 overflow-hidden">
          {bookings.map((b) => {
            const last = lastMsgs[b.id];
            const unread = unreadCounts[b.id] ?? 0;
            const otherName = b.organizer_name || b.organizer_email || 'Organizer';
            const initial = otherName.charAt(0).toUpperCase();

            return (
              <li key={b.id}>
                <Link
                  href={`/bookings/${b.id}/chat`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-sunken transition"
                >
                  <div className="relative shrink-0">
                    <div className="avatar avatar-md inline-flex items-center justify-center bg-brand-100 text-brand-700 text-sm font-semibold">
                      {initial}
                    </div>
                  </div>

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
