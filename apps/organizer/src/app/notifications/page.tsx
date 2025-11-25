'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@arteve/supabase/client';

type Notification = {
  id: string;
  type: string | null;
  title: string | null;
  body: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

function resolveNotificationLink(n: Notification) {
  const d = n.data || {};

  switch (n.type) {
    case 'gig_application':
      return `/gigs/${d.gig_id}/applications`;
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

export default function OrganizerNotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
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
  };

  useEffect(() => {
    load();
  }, []);

  const markAllAsRead = async () => {
    setMarking(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMarking(false);
      return;
    }

    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null)
      .eq('user_id', user.id);

    setItems(prev =>
      prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );

    setMarking(false);
  };

  if (loading) {
    return <main className="p-6">Loading notifications…</main>;
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Notifications</h1>

        {items.some(n => !n.read_at) && (
          <button
            onClick={markAllAsRead}
            disabled={marking}
            className="text-sm text-blue-600 hover:underline disabled:opacity-60"
          >
            {marking ? 'Marking…' : 'Mark all as read'}
          </button>
        )}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-gray-500">No notifications yet.</p>
      )}

      <div className="space-y-3">
        {items.map(n => (
          <a
            key={n.id}
            href={`${resolveNotificationLink(n)}?notification_id=${n.id}`}
            className={`block p-4 border rounded-xl ${
              !n.read_at ? 'bg-blue-50 border-blue-100' : 'bg-white'
            }`}
          >
            <p className="font-medium">{n.title || 'Notification'}</p>
            {n.body && <p className="text-gray-700 mt-1">{n.body}</p>}
            <p className="text-xs text-gray-400 mt-1">
              {new Date(n.created_at).toLocaleString()}
            </p>
          </a>
        ))}
      </div>
    </main>
  );
}
