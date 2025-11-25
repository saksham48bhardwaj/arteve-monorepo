'use client';

import { supabase } from '@arteve/supabase/client';
import { useEffect, useState } from 'react';

type NotificationRow = {
  id: string;
  user_id: string;
  read_at: string | null;
} & Record<string, unknown>;

export function useRealtimeNotifications() {
  const [unread, setUnread] = useState(0);
  const [lastNotification, setLastNotification] =
    useState<NotificationRow | null>(null);

  useEffect(() => {
    let active = true;

    async function init() {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) return;

      // Load initial unread count
      const { data: rows } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .is('read_at', null);

      if (active) {
        setUnread(rows?.length ?? 0);
      }

      // Realtime: listen to INSERTs + UPDATEs on notifications
      const channel = supabase
        .channel(`notifications-realtime-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
          },
          (payload) => {
            const newRow = payload.new as NotificationRow;
            if (newRow.user_id === userId && newRow.read_at === null) {
              setUnread((prev) => prev + 1);
              setLastNotification(newRow);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
          },
          (payload) => {
            const oldRow = payload.old as NotificationRow;
            const newRow = payload.new as NotificationRow;

            if (newRow.user_id === userId) {
              // If read_at changed from null → non-null, decrease count
              if (oldRow.read_at === null && newRow.read_at !== null) {
                setUnread((prev) => Math.max(prev - 1, 0));
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    init();

    return () => {
      active = false;
    };
  }, []);

  return { unread, lastNotification };
}
