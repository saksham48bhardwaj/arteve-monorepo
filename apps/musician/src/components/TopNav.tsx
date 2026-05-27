'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { useRealtimeNotifications } from '@arteve/shared/notifications/realtime';
import { supabase } from '@arteve/supabase/client';
import LogoutButton from './logout-button';

type HeaderKind = 'logo' | 'title' | 'profile' | 'hidden';

interface HeaderConfig {
  kind: HeaderKind;
  title?: string;
  showBack?: boolean;
  rightSlot?: 'home' | 'profile-menu' | 'none';
}

function getHeaderConfig(pathname: string, profileHandleFromUrl?: string): HeaderConfig {
  // Chat pages handle their own header
  if (pathname.endsWith('/chat') && pathname !== '/chat') return { kind: 'hidden' };
  if (pathname.startsWith('/chat/') && pathname !== '/chat') return { kind: 'hidden' };
  // Pages that render their own page chrome (fullscreen / large composer / search)
  if (pathname === '/bits') return { kind: 'hidden' };
  if (pathname === '/post') return { kind: 'hidden' };
  if (pathname === '/find') return { kind: 'hidden' };
  if (pathname === '/post/new') return { kind: 'hidden' };
  if (pathname === '/bits/new') return { kind: 'hidden' };

  if (pathname === '/') {
    return { kind: 'logo', rightSlot: 'home' };
  }

  if (pathname === '/profile') {
    return { kind: 'profile', rightSlot: 'profile-menu' };
  }

  if (pathname === '/profile/edit') {
    return { kind: 'title', title: 'Edit profile', showBack: true };
  }

  // /profile/[handle]
  if (pathname.startsWith('/profile/') && profileHandleFromUrl) {
    return { kind: 'title', title: `@${profileHandleFromUrl}`, showBack: true, rightSlot: 'profile-menu' };
  }

  // Specific sections
  const m = (re: RegExp, cfg: HeaderConfig) => re.test(pathname) ? cfg : null;
  return (
    m(/^\/find$/, { kind: 'title', title: 'Find' }) ??
    m(/^\/post$/, { kind: 'title', title: 'Post' }) ??
    m(/^\/post\/new$/, { kind: 'title', title: 'New post', showBack: true }) ??
    m(/^\/bits\/new$/, { kind: 'title', title: 'New bit', showBack: true }) ??
    m(/^\/bookings$/, { kind: 'title', title: 'Bookings' }) ??
    m(/^\/bookings\/[^/]+$/, { kind: 'title', title: 'Booking', showBack: true }) ??
    m(/^\/applications(\/.*)?$/, { kind: 'title', title: 'Applications', showBack: true }) ??
    m(/^\/chat$/, { kind: 'title', title: 'Messages', showBack: true }) ??
    m(/^\/notifications$/, { kind: 'title', title: 'Notifications', showBack: true }) ??
    m(/^\/gigs$/, { kind: 'title', title: 'Gigs' }) ??
    m(/^\/gigs\/[^/]+$/, { kind: 'title', title: 'Gig', showBack: true }) ??
    m(/^\/gigs\/[^/]+\/apply$/, { kind: 'title', title: 'Apply', showBack: true }) ??
    m(/^\/press-kit$/, { kind: 'title', title: 'Press kit' }) ??
    m(/^\/whats-on$/, { kind: 'title', title: "What's on" }) ??
    m(/^\/whats-on\/[^/]+$/, { kind: 'title', title: "What's on", showBack: true }) ??
    m(/^\/venue\/[^/]+$/, { kind: 'title', title: 'Venue', showBack: true }) ??
    { kind: 'title', title: 'Arteve' }
  );
}

export default function TopNav() {
  const { unread } = useRealtimeNotifications();
  const [open, setOpen] = useState(false);
  const [myHandle, setMyHandle] = useState<string | null>(null);
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const params = useParams<{ handle?: string }>();

  // Fetch current user handle when on /profile (own profile)
  useEffect(() => {
    if (pathname !== '/profile') return;
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data: p } = await supabase
        .from('profiles')
        .select('handle')
        .eq('id', auth.user.id)
        .maybeSingle<{ handle: string | null }>();
      if (!cancelled && p?.handle) setMyHandle(p.handle);
    })();
    return () => { cancelled = true; };
  }, [pathname]);

  const handleFromUrl =
    pathname.startsWith('/profile/') && pathname !== '/profile/edit' ? params?.handle : undefined;

  const config = getHeaderConfig(pathname, handleFromUrl as string | undefined);

  if (config.kind === 'hidden') return null;

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="mx-auto max-w-3xl h-14 px-4 flex items-center justify-between gap-2">
        {/* LEFT */}
        <div className="flex items-center min-w-0 flex-1">
          {config.showBack && (
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              className="inline-flex h-9 w-9 -ml-1 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}

          {config.kind === 'logo' && (
            <Link href="/" className="flex items-center">
              <Image src="/images/arteve_logo.png" alt="Arteve" width={96} height={24} priority />
            </Link>
          )}

          {config.kind === 'profile' && (
            <span className="text-base font-semibold text-ink-strong truncate">
              {myHandle ? `@${myHandle}` : 'Profile'}
            </span>
          )}

          {config.kind === 'title' && (
            <h1 className="text-base font-semibold text-ink-strong truncate">{config.title}</h1>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-1">
          {config.rightSlot === 'home' && (
            <>
              <Link
                href="/notifications"
                aria-label="Notifications"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14V11a6 6 0 1 0-12 0v3a2 2 0 0 1-.6 1.4L4 17h5" />
                  <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
                </svg>
                {unread > 0 && (
                  <span className="absolute top-1 right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
              <Link
                href="/chat"
                aria-label="Messages"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z" />
                </svg>
              </Link>
            </>
          )}

          {config.rightSlot === 'profile-menu' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition"
                aria-label="More options"
                aria-expanded={open}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
              {open && (
                <>
                  <button
                    type="button"
                    aria-hidden
                    onClick={() => setOpen(false)}
                    className="fixed inset-0 z-30 cursor-default"
                  />
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-line bg-surface shadow-lg p-1.5 z-40">
                    {pathname === '/profile' && (
                      <Link
                        href="/profile/edit"
                        onClick={() => setOpen(false)}
                        className="block w-full rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-surface-sunken"
                      >
                        Edit profile
                      </Link>
                    )}
                    <LogoutButton fullWidth variant="ghost" />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
