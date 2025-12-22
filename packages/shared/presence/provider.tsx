'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@arteve/supabase/client';

export type PresenceContextType = {
  onlineUsers: Record<string, boolean>;
  lastSeen: Record<string, string>; // ISO timestamps
};

export const PresenceContext = createContext<PresenceContextType>({
  onlineUsers: {},
  lastSeen: {}
});

export function usePresence() {
  return useContext(PresenceContext);
}

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [lastSeen, setLastSeen] = useState<Record<string, string>>({});

  useEffect(() => {
    const channel = supabase
      .channel('presence', {
        config: {
          presence: { key: 'user_id' },
        },
      })

      // SYNC: authoritative online map from presenceState
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();

        setOnlineUsers(prev => {
          const next: Record<string, boolean> = {};

          // mark users in state as online
          Object.entries(state).forEach(([userId, arr]) => {
            next[userId] = Array.isArray(arr) && arr.length > 0;
          });

          // keep keys from prev but mark offline if missing from state
          Object.keys(prev).forEach(userId => {
            if (!(userId in next)) next[userId] = false;
          });

          return next;
        });

        // only set lastSeen if we don't have it yet (so it doesn't constantly change)
        setLastSeen(prev => {
          const next = { ...prev };
          Object.entries(state).forEach(([userId, arr]) => {
            const isOnline = Array.isArray(arr) && arr.length > 0;
            if (isOnline && !next[userId]) {
              next[userId] = new Date().toISOString();
            }
          });
          return next;
        });
      })

      // JOIN: mark online + update lastSeen
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers(prev => ({ ...prev, [key]: true }));
        setLastSeen(prev => ({ ...prev, [key]: new Date().toISOString() }));
      })

      // LEAVE: mark offline + update lastSeen to the leave time
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => ({ ...prev, [key]: false }));
        setLastSeen(prev => ({ ...prev, [key]: new Date().toISOString() }));
      })

      .subscribe(async status => {
        if (status !== 'SUBSCRIBED') return;

        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        if (userId) channel.track({ user_id: userId });
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <PresenceContext.Provider value={{ onlineUsers, lastSeen }}>
      {children}
    </PresenceContext.Provider>
  );
}
