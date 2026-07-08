'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';
import { toast } from '@arteve/ui/components';

// This is the organizer app. Accounts are single-role (one Supabase project is
// shared by both apps), so a musician account must not be allowed to operate
// here. If a mismatched account is detected we sign it out and bounce to login
// with a clear pointer to the correct app.
const APP_ROLE = 'organizer';
const OTHER_APP = { label: 'musician', url: 'https://arteve.in' };

const SKIP = ['/login', '/reset-password', '/onboarding'];

export default function RoleGuard() {
  const router = useRouter();
  const pathname = usePathname() ?? '';

  useEffect(() => {
    if (SKIP.includes(pathname) || pathname.startsWith('/auth/')) return;

    let cancelled = false;

    async function check(uid: string) {
      const { data: prof } = await supabase
        .from('profiles').select('role').eq('id', uid).maybeSingle<{ role: string | null }>();
      if (cancelled) return;
      if (prof?.role && prof.role !== APP_ROLE) {
        toast.error(`This is a ${prof.role} account. Please use the ${OTHER_APP.label} app at ${OTHER_APP.url.replace('https://', '')}.`);
        await supabase.auth.signOut({ scope: 'local' }); // default 'global' would kill sessions on the other Arteve app + all devices
        router.replace('/login');
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) check(data.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) check(session.user.id);
    });

    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [pathname, router]);

  return null;
}
