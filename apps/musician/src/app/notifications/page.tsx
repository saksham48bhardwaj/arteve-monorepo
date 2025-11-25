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

  async function load() {
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
  }

  useEffect(() => {
    load();
  }, []);

  const markAsRead = async (id: number) => {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);

    setItems(prev =>
      prev.map(n => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
  };

  if (loading) return <main className="p-6">Loading…</main>;

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Notifications</h1>

      {items.length === 0 && (
        <p className="text-gray-500">No notifications yet.</p>
      )}

      <div className="space-y-3">
        {items.map(n => (
          <a
            key={n.id}
            href={`${resolveNotificationLink(n)}?notification_id=${n.id}`}
            className={`block p-4 border rounded-xl ${
              n.read_at ? 'bg-white' : 'bg-blue-50'
            }`}
          >
            <p className="font-medium">{n.title || `${n.type} update`}</p>
            <p className="text-sm text-gray-700">{n.body || ''}</p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(n.created_at).toLocaleString()}
            </p>

            {!n.read_at && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  markAsRead(n.id);
                }}
                className="mt-2 text-xs text-blue-600 underline"
              >
                Mark as read
              </button>
            )}
          </a>
        ))}
      </div>
    </main>
  );
}
