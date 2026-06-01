'use client';

import { supabase } from '@arteve/supabase/client';
import { useEffect, useRef, useState } from 'react';

type NotificationRow = {
  id: number;
  user_id: string;
  read_at: string | null;
} & Record<string, unknown>;

/**
 * Tracks the current user's unread-notification count in realtime.
 *
 * The unread badge is driven entirely by an authoritative COUNT query rather
 * than by diffing realtime payloads. Postgres only ships the previous row
 * (`payload.old`) when the table is set to REPLICA IDENTITY FULL; with the
 * default identity, `payload.old` contains just the primary key, so the old
 * "decrement when read_at went null → not-null" logic never fired and the
 * badge stayed stuck after marking notifications read. Re-counting on every
 * change is cheap (head-only count) and correct regardless of replica identity.
 */
export function useRealtimeNotifications() {
  const [unread, setUnread] = useState(0);
  const [lastNotification, setLastNotification] =
    useState<NotificationRow | null>(null);

  const userIdRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function recount() {
      const userId = userIdRef.current;
      if (!userId) return;
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null);
      if (active) setUnread(count ?? 0);
    }

    // Coalesce bursts — e.g. "mark all as read" emits one UPDATE event per row.
    function scheduleRecount() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void recount();
      }, 250);
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') scheduleRecount();
    }

    async function init() {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) return;
      userIdRef.current = userId;

      await recount();

      // Unique channel name per hook instance: TopNav and SideNav both mount
      // this hook, and a shared topic name would let one unmount tear down the
      // other's subscription.
      const suffix = Math.random().toString(36).slice(2);
      channel = supabase
        .channel(`notifications-realtime-${userId}-${suffix}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const newRow = payload.new as NotificationRow;
            if (!active) return;
            if (newRow.read_at === null) {
              // Optimistic bump for snappy UX; the debounced recount reconciles.
              setUnread((prev) => prev + 1);
              setLastNotification(newRow);
            }
            scheduleRecount();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          () => scheduleRecount()
        )
        .subscribe();
    }

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    void init();

    return () => {
      active = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (channel) supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, []);

  return { unread, lastNotification };
}
