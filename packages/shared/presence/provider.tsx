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
    const channel = supabase.channel('presence', {
      config: {
        presence: {
          key: 'uid',
        },
      },
    })
      // SYNC: update online users + track presence state
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();

        const online: Record<string, boolean> = {};
        const tempLastSeen = { ...lastSeen };

        Object.entries(state).forEach(([userId, arr]) => {
          const isOnline = Array.isArray(arr) && arr.length > 0;
          online[userId] = isOnline;

          // If user was just seen online NOW, update timestamp
          if (isOnline) {
            tempLastSeen[userId] = new Date().toISOString();
          }
        });

        setOnlineUsers(online);
        setLastSeen(tempLastSeen);
      })

      // LEAVE: update lastSeen
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const next = { ...prev };
          next[key] = false;
          return next;
        });

        setLastSeen(prev => ({
          ...prev,
          [key]: new Date().toISOString(),
        }));
      })

      .subscribe(async () => {
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;

        if (userId) {
          channel.track({ uid: userId });
        }
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
