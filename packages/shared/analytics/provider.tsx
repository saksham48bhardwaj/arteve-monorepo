'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';
import { initAnalytics, identify, resetAnalytics, trackPageview } from './posthog';

// Mount once at the app root. Initializes PostHog (no-op without the env
// var), identifies the signed-in user, listens to auth state changes, and
// emits a pageview on every route change.
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Init + identify + auth-state subscription
  useEffect(() => {
    initAnalytics();

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        identify(data.user.id, { email: data.user.email });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        identify(session.user.id, { email: session.user.email });
      } else if (event === 'SIGNED_OUT') {
        resetAnalytics();
      }
    });

    return () => { sub.subscription.unsubscribe(); };
  }, []);

  // Pageview tracking — App Router doesn't auto-emit
  useEffect(() => {
    if (!pathname) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : '');
    trackPageview(url);
  }, [pathname, searchParams]);

  return <>{children}</>;
}
