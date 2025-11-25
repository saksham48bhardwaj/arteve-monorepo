'use client';

import Link from 'next/link';
import { useRealtimeNotifications } from '@arteve/shared/notifications/realtime';

export default function TopNav() {
  const { unread } = useRealtimeNotifications();

  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-5xl h-14 px-4 flex items-center justify-between">
        
        {/* Left: Logo */}
        <Link href="/" className="font-semibold tracking-wide">ARTEVE</Link>

        <Link href="/bookings" className="...">Bookings</Link>

        {/* Right: Notifications + Chat */}
        <div className="flex items-center gap-3">

          {/* NOTIFICATIONS */}
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border hover:bg-gray-50"
            title="Notifications"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14V11a6 6 0 1 0-12 0v3a2 2 0 0 1-.6 1.4L4 17h5" />
              <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
            </svg>

            {unread > 0 && (
              <span className="
                absolute -top-1 -right-1 bg-red-600 text-white text-[10px]
                rounded-full w-4 h-4 flex items-center justify-center
              ">
                {unread}
              </span>
            )}
          </Link>

          {/* CHAT ICON */}
          <Link
            href="/chat"
            aria-label="Messages"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border hover:bg-gray-50"
            title="Messages"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z"/>
            </svg>
          </Link>

        </div>
      </div>
    </header>
  );
}
