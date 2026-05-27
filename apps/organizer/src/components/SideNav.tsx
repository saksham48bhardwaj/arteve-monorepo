'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import LogoutButton from './logout-button';
import { useRealtimeNotifications } from '@arteve/shared/notifications/realtime';

type IconName = 'home' | 'search' | 'plus' | 'list' | 'user' | 'message' | 'bell' | 'settings';

const mainNav: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/find', label: 'Find', icon: 'search' },
  { href: '/gigs/create', label: 'Create gig', icon: 'plus' },
  { href: '/gigs', label: 'Gigs', icon: 'list' },
  { href: '/profile', label: 'Profile', icon: 'user' },
];

const secondaryNav: { href: string; label: string; icon: IconName; badge?: boolean }[] = [
  { href: '/chat', label: 'Messages', icon: 'message' },
  { href: '/notifications', label: 'Notifications', icon: 'bell', badge: true },
  { href: '/account', label: 'Account', icon: 'settings' },
];

function Icon({ name }: { name: IconName }) {
  switch (name) {
    case 'home':    return <path d="M3 10.5 12 3l9 7.5V21H4V10.5z" />;
    case 'search':  return (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></>);
    case 'plus':    return <path d="M12 5v14M5 12h14" />;
    case 'list':    return <path d="M3 6h18M3 12h18M3 18h18" />;
    case 'user':    return (<><circle cx="12" cy="8" r="4" /><path d="M6 20a6 6 0 0 1 12 0" /></>);
    case 'message': return <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z" />;
    case 'bell':    return (<><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14V11a6 6 0 1 0-12 0v3a2 2 0 0 1-.6 1.4L4 17h5" /><path d="M9 17v1a3 3 0 0 0 6 0v-1" /></>);
    case 'settings': return (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>);
    default:        return null;
  }
}

function NavLink({
  href, label, icon, active, badgeCount,
}: {
  href: string; label: string; icon: IconName; active: boolean; badgeCount?: number;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? 'bg-brand-50 text-brand-700'
          : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-5 w-5 ${active ? 'text-brand' : 'text-ink-subtle group-hover:text-ink-muted'}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Icon name={icon} />
      </svg>
      <span className="flex-1">{label}</span>
      {badgeCount ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-semibold text-white">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      ) : null}
    </Link>
  );
}

export default function SideNav() {
  const pathname = usePathname() ?? '';
  const { unread } = useRealtimeNotifications();

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-line bg-surface">
      <div className="px-5 pt-6 pb-4">
        <Link href="/" className="inline-flex items-center gap-2">
          <Image src="/images/arteve_logo.png" alt="Arteve Organizer" width={108} height={28} priority />
        </Link>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-subtle">
          Organizer
        </p>
      </div>

      <nav className="flex-1 px-3 pt-2 space-y-1 overflow-y-auto">
        {mainNav.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            active={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}

        <div className="my-4 h-px bg-line" />

        {secondaryNav.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            active={pathname === item.href || pathname.startsWith(item.href + '/')}
            badgeCount={item.badge ? unread : undefined}
          />
        ))}
      </nav>

      <div className="border-t border-line px-4 py-4">
        <LogoutButton fullWidth />
      </div>
    </aside>
  );
}
