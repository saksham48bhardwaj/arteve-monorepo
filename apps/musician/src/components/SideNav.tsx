'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from './logout-button';
import Image from 'next/image';

const mainNav = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/find', label: 'Find', icon: 'search' },
  { href: '/post', label: 'Post', icon: 'plus' },
  { href: '/bits', label: 'Bits', icon: 'play' },
  { href: '/profile', label: 'Profile', icon: 'user' },
];

const secondaryNav = [
  { href: '/bookings', label: 'Bookings', icon: 'calendar' },
];

function Icon({ name }: { name: string }) {
  switch (name) {
    case 'home':
      return (
        <path d="M3 10.5 12 3l9 7.5V21H4V10.5z" />
      );
    case 'search':
      return (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3-3" />
        </>
      );
    case 'plus':
      return (
        <>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </>
      );
    case 'play':
      return (
        <>
          <rect x="3" y="4" width="18" height="14" rx="3" />
          <path d="M10 9l5 3-5 3V9z" />
        </>
      );
    case 'user':
      return (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M6 20a6 6 0 0 1 12 0" />
        </>
      );
    case 'calendar':
      return (
        <>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M3 10h18" />
          <path d="M9 3v4" />
          <path d="M15 3v4" />
        </>
      );
    default:
      return null;
  }
}

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2 transition ${
        active ? 'bg-[#4E7FA2]/10 text-[#1f3f59]' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-5 w-5 ${
          active ? 'text-[#4E7FA2]' : 'text-slate-500 group-hover:text-slate-700'
        }`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <Icon name={icon} />
      </svg>
      <span>{label}</span>
    </Link>
  );
}

export default function SideNav() {
  const pathname = usePathname() ?? '';

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-56 border-slate-200 bg-white backdrop-blur rounded-r-2xl shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
      <div className="flex h-full flex-col">
        <div className="px-4 pt-4 pb-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/arteve_logo.png"
              alt="Arteve Organizer"
              width={100}
              height={0}
              className="mx-auto mt-2 mb-8"
            />
          </Link>
        </div>

        <nav className="flex-1 px-2 space-y-3">
          {mainNav.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={
                pathname === item.href ||
                pathname.startsWith(item.href + '/')
              }
            />
          ))}

          <div className="mt-4 pt-3 border-t border-slate-200">
            {secondaryNav.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                active={
                  pathname === item.href ||
                  pathname.startsWith(item.href + '/')
                }
              />
            ))}
          </div>
        </nav>

        <div className="border-t border-slate-200 px-3 py-3">
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
