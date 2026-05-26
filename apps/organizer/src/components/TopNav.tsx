'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRealtimeNotifications } from '@arteve/shared/notifications/realtime';
import { usePathname } from 'next/navigation';

export default function TopNav() {
  const { unread } = useRealtimeNotifications();
  const pathname = usePathname() ?? '';

  if (pathname.endsWith('/chat') && pathname !== '/chat') return null;

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 border-b border-line bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
      <div className="mx-auto max-w-3xl h-14 px-4 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/images/arteve_logo.png" alt="Arteve Organizer" width={96} height={24} priority />
          <span className="hidden xs:inline text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-subtle">
            Organizer
          </span>
        </Link>

        <div className="flex items-center gap-1">
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
        </div>
      </div>
    </header>
  );
}
