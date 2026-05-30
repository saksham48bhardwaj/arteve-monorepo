'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

type Tab = { href: string; label: string; svg: ReactNode };

function Item({ href, label, svg, active }: Tab & { active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition ${
        active ? 'text-brand' : 'text-ink-subtle hover:text-ink-muted'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <span className="h-6 w-6">{svg}</span>
      <span>{label}</span>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname() ?? '';

  // Hide on chat detail pages
  if ((pathname.endsWith('/chat') && pathname !== '/chat') || pathname.startsWith('/chat/')) {
    return null;
  }

  const is = (p: string) => pathname === p || pathname.startsWith(p + '/');

  const tabs: Tab[] = [
    { href: '/',        label: 'Home',    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5V21H4V10.5z" /></svg> },
    { href: '/find',    label: 'Find',    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg> },
    { href: '/post',    label: 'Post',    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg> },
    { href: '/bits',    label: 'Bits',    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="14" rx="3" /><path d="M10 9l5 3-5 3V9z" /></svg> },
    { href: '/gigs',    label: 'Gigs',    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 10h18M9 3v4M15 3v4" /></svg> },
    { href: '/profile', label: 'Profile', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M6 20a6 6 0 0 1 12 0" /></svg> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40">
      <div className="mx-auto max-w-3xl px-3 pb-[env(safe-area-inset-bottom)]">
        <div className="mt-1 rounded-t-2xl border border-line border-b-0 bg-surface/95 backdrop-blur grid grid-cols-6 pt-2 pb-2 shadow-[0_-8px_24px_rgba(28,26,23,0.06)]">
          {tabs.map((t) => (
            <Item key={t.href} {...t} active={is(t.href)} />
          ))}
        </div>
      </div>
    </nav>
  );
}
