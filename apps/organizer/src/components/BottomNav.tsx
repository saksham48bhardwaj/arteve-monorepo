'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

function Tab({ href, label, svg }: { href: string; label: string; svg: ReactNode }) {
  const active = usePathname() === href;
  return (
    <Link href={href} className="flex flex-col items-center justify-center text-xs gap-1">
      <span className={`h-6 w-6 ${active ? 'text-black' : 'text-gray-500'}`}>{svg}</span>
      <span className={active ? 'text-black' : 'text-gray-500'}>{label}</span>
    </Link>
  );
}

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-5xl h-16 px-2 grid grid-cols-5">
        <Tab href="/" label="Home" svg={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 10.5 12 3l9 7.5V21H4V10.5z"/></svg>} />
        <Tab href="/gigs/create" label="Create" svg={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14M5 12h14"/></svg>} />
        <Tab href="/gigs" label="Gigs" svg={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M3 12h18M3 18h18"/></svg>} />
        <Tab href="/chat" label="Chat" svg={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z"/></svg>} />
        <Tab href="/profile" label="Profile" svg={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M6 20a6 6 0 0 1 12 0"/></svg>} />
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
