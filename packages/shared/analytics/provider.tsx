'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';
import { initAnalytics, identify, resetAnalytics, trackPageview } from './posthog';

// Mount once at the app root. Initializes PostHog (no-op without the env
// var), identifies the signed-in user, listens to auth state changes, and
// emits a pageview on every route change.
//
// useSearchParams() is isolated inside <PageviewTracker> behind a Suspense
// boundary because Next.js refuses to prerender any static page (e.g. the
// /_not-found page generated for the App Router) that uses it without one.
// Without this split the production build fails with:
//   useSearchParams() should be wrapped in a suspense boundary at page "/404"
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  // Init + identify + auth-state subscription — no router hooks here so this
  // is safe to render during static prerender of /_not-found etc.
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

  return (
    <>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </>
  );
}

// Pageview tracking — App Router doesn't auto-emit. Isolated so the
// useSearchParams() bailout only affects this empty subtree.
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : '');
    trackPageview(url);
  }, [pathname, searchParams]);

  return null;
}
