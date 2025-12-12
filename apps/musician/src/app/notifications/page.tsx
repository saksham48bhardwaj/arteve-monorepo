'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@arteve/supabase/client';

type Notification = {
  id: number;
  user_id: string;
  actor_id: string | null;
  type: string | null;
  entity_type: string | null;
  entity_id: number | string | null;
  created_at: string;
  read_at: string | null;
  title?: string | null;
  body?: string | null;
  data?: Record<string, unknown> | null;
};

// Icon mapping for musicians
const icons: Record<string, string> = {
  gig_application: '🎤',
  application_status: '📢',
  gig_closed: '🚫',
  booking_created: '📘',
  new_message: '💬',
};

function resolveNotificationLink(n: Notification) {
  const d = n.data || {};

  switch (n.type) {
    case 'gig_application':
      return `/applications/review/${d.gig_id}`;
    case 'application_status':
      return `/gigs/${d.gig_id}`;
    case 'gig_closed':
      return `/gigs/${d.gig_id}`;
    case 'booking_created':
      return `/bookings/${d.booking_id}/chat`;
    case 'new_message':
      return `/bookings/${d.booking_id}/chat`;
    default:
      return '/notifications';
  }
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [marking, setMarking] = useState(false);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setItems(data as Notification[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const markAsRead = async (id: number) => {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);

    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
  };

  const markAllAsRead = async () => {
    setMarking(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMarking(false);
      return;
    }

    const now = new Date().toISOString();

    await supabase
      .from('notifications')
      .update({ read_at: now })
      .is('read_at', null)
      .eq('user_id', user.id);

    setItems((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? now }))
    );

    setMarking(false);
  };

  const filteredItems = showUnreadOnly
    ? items.filter((n) => !n.read_at)
    : items;

  if (loading)
    return (
      <main className="min-h-screen flex items-center justify-center text-slate-500">
        Loading…
      </main>
    );

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      {/* HEADER */}
      <div className="border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
                Notifications
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Updates about your gigs, bookings, and applications.
              </p>
            </div>

            {items.some((n) => !n.read_at) && (
              <button
                onClick={markAllAsRead}
                disabled={marking}
                className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                {marking ? 'Marking…' : 'Mark all as read'}
              </button>
            )}
          </div>

          {/* UNREAD TOGGLE */}
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => setShowUnreadOnly(false)}
              className={`px-4 py-1.5 rounded-full text-sm border transition ${
                !showUnreadOnly
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              All
            </button>

            <button
              onClick={() => setShowUnreadOnly(true)}
              className={`px-4 py-1.5 rounded-full text-sm border transition ${
                showUnreadOnly
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              Unread
            </button>
          </div>
        </div>
      </div>

      {/* LIST */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        {filteredItems.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-10">
            No notifications.
          </p>
        )}

        {filteredItems.map((n) => (
          <a
            key={n.id}
            href={`${resolveNotificationLink(n)}?notification_id=${n.id}`}
            className={`flex items-start gap-4 p-5 rounded-3xl border transition shadow-sm hover:shadow bg-white ${
              !n.read_at 
                ? 'border-blue-200 bg-blue-50/50'
                : 'border-slate-200'
            }`}
          >
            {/* ICON */}
            <div className="text-2xl">
              {icons[n.type || ''] || '🔔'}
            </div>

            {/* TEXT */}
            <div className="flex-1">
              <p className="font-medium text-slate-900">
                {n.title || `${n.type} update`}
              </p>

              {n.body && (
                <p className="text-slate-600 text-sm mt-1">{n.body}</p>
              )}

              <p className="text-xs text-slate-400 mt-1">
                {new Date(n.created_at).toLocaleString()}
              </p>

              {/* MARK AS READ BUTTON */}
              {!n.read_at && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    markAsRead(n.id);
                  }}
                  className="mt-2 text-xs font-medium text-blue-600 hover:underline"
                >
                  Mark as read
                </button>
              )}
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}
