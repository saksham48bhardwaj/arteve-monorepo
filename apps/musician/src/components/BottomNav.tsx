'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

function Item({ href, label, svg, active }: { href:string; label:string; svg:ReactNode; active:boolean }) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center text-xs gap-1">
      <span className={`h-6 w-6 ${active ? 'text-black' : 'text-gray-500'}`}>{svg}</span>
      <span className={active ? 'text-black' : 'text-gray-500'}>{label}</span>
    </Link>
  );
}

export default function BottomNav() {
  const p = usePathname();
  // usePathname() can return null in some router states — fall back to empty string
  const pNonNull = p ?? '';
  const is = (path: string) => pNonNull === path || pNonNull.startsWith(path + '/');

  const tabs = [
    { href: '/',      label: 'Home',   svg:
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 10.5 12 3l9 7.5V21H4V10.5z"/></svg> },
    { href: '/find',  label: 'Find',   svg:
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg> },
    { href: '/post',  label: 'Post',   svg:
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14M5 12h14"/></svg> },
    { href: '/bits',  label: 'Bits',   svg:
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="14" rx="3"/><path d="M10 9l5 3-5 3V9z"/></svg> },
    { href: '/profile', label: 'Profile', svg:
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M6 20a6 6 0 0 1 12 0"/></svg> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-5xl h-16 px-2 grid grid-cols-5">
        {tabs.map(t => <Item key={t.href} {...t} active={is(t.href)} />)}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
