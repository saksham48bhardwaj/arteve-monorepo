'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

function Tab({
  href,
  label,
  svg,
  active,
}: {
  href: string;
  label: string;
  svg: ReactNode;
  active: boolean;
}) {
  const color = active ? 'text-[#4E7FA2]' : 'text-slate-500';
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center text-[11px] gap-1"
    >
      <span className={`h-6 w-6 ${color}`}>{svg}</span>
      <span className={color}>{label}</span>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname() ?? '';

  if (pathname.endsWith('/chat') && pathname !== '/chat') {
    return null;
  }

  const tabs = [
    {
      href: '/',
      label: 'Home',
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 10.5 12 3l9 7.5V21H4V10.5z" />
        </svg>
      ),
    },
    {
      href: '/find',
      label: 'Find',
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3-3" />
        </svg>
      ),
    },
    {
      href: '/gigs/create',
      label: 'Create',
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      ),
    },
    {
      href: '/gigs',
      label: 'Gigs',
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 6h18" />
          <path d="M3 12h18" />
          <path d="M3 18h18" />
        </svg>
      ),
    },
    {
      href: '/profile',
      label: 'Profile',
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="4" />
          <path d="M6 20a6 6 0 0 1 12 0" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40">
      <div className="mx-auto max-w-5xl pb-[env(safe-area-inset-bottom)]">
        <div className="pb-8 pt-2 mt-1 rounded-t-2xl border border-slate-200 bg-white/95 backdrop-blur shadow-[0_8px_24px_rgba(15,23,42,0.12)] grid grid-cols-5">
          {tabs.map((tab) => (
            <Tab
              key={tab.href}
              {...tab}
              active={pathname === tab.href || pathname.startsWith(tab.href + '/')}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
