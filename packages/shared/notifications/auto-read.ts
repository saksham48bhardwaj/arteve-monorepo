'use client';

import { supabase } from '@arteve/supabase/client';
import { useEffect } from 'react';

export function useMarkNotificationAsRead(notificationId?: string | number | null) {
  useEffect(() => {
    if (!notificationId) return;

    async function run() {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);
    }

    run();
  }, [notificationId]);
}
