'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import LogoutButton from './logout-button';
import { useRealtimeNotifications } from '@arteve/shared/notifications/realtime';

type IconName =
  | 'home' | 'search' | 'plus' | 'play' | 'user'
  | 'calendar' | 'message' | 'bell';

const mainNav: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/find', label: 'Find', icon: 'search' },
  { href: '/post', label: 'Post', icon: 'plus' },
  { href: '/bits', label: 'Bits', icon: 'play' },
  { href: '/profile', label: 'Profile', icon: 'user' },
];

const secondaryNav: { href: string; label: string; icon: IconName; badge?: boolean }[] = [
  { href: '/bookings', label: 'Bookings', icon: 'calendar' },
  { href: '/chat', label: 'Messages', icon: 'message' },
  { href: '/notifications', label: 'Notifications', icon: 'bell', badge: true },
];

function Icon({ name }: { name: IconName }) {
  switch (name) {
    case 'home':     return <path d="M3 10.5 12 3l9 7.5V21H4V10.5z" />;
    case 'search':   return (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></>);
    case 'plus':     return <path d="M12 5v14M5 12h14" />;
    case 'play':     return (<><rect x="3" y="4" width="18" height="14" rx="3" /><path d="M10 9l5 3-5 3V9z" /></>);
    case 'user':     return (<><circle cx="12" cy="8" r="4" /><path d="M6 20a6 6 0 0 1 12 0" /></>);
    case 'calendar': return (<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 10h18M9 3v4M15 3v4" /></>);
    case 'message':  return <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z" />;
    case 'bell':     return (<><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14V11a6 6 0 1 0-12 0v3a2 2 0 0 1-.6 1.4L4 17h5" /><path d="M9 17v1a3 3 0 0 0 6 0v-1" /></>);
    default:         return null;
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
        <Link href="/" className="inline-flex items-center">
          <Image
            src="/images/arteve_logo.png"
            alt="Arteve"
            width={108}
            height={28}
            priority
          />
        </Link>
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
