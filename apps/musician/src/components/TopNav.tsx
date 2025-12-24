'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRealtimeNotifications } from '@arteve/shared/notifications/realtime';
import LogoutButton from './logout-button';
import { usePathname } from 'next/navigation';
import path from 'path';

export default function TopNav() {
  const { unread } = useRealtimeNotifications();
  const [open, setOpen] = useState(false);

  const pathname = usePathname() ?? '';

  if (pathname.endsWith('/chat') && pathname !== '/chat' || pathname.startsWith('/chat/')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto max-w-6xl h-14 px-4 md:px-6 flex items-center justify-between gap-4">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/arteve_logo.png"
            alt="Arteve Musician"
            width={100}
            height={0}
          />
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          
          {/* Notifications */}
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative inline-flex items-center justify-center text-slate-600 hover:bg-slate-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14V11a6 6 0 1 0-12 0v3a2 2 0 0 1-.6 1.4L4 17h5" />
              <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
            </svg>

            {unread > 0 && (
              <span className="absolute -top-2 -right-1 bg-red-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {unread}
              </span>
            )}
          </Link>

          {/* Chat */}
          <Link
            href="/chat"
            aria-label="Messages"
            className="inline-flex items-center justify-center text-slate-600 hover:bg-slate-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z" />
            </svg>
          </Link>

          {/* MORE (mobile only) */}
          <div className="relative md:hidden">
            <button
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center justify-center text-slate-600 hover:bg-slate-50"
              aria-label="More options"
            >
              ⋮
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white shadow-lg">
                <div className="p-2">
                  <LogoutButton className="w-full justify-center border-red-300 text-red-600 hover:bg-red-50" />
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
