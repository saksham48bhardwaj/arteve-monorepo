'use client';

import { usePathname } from 'next/navigation';
import TopNav from './TopNav';
import BottomNav from './BottomNav';
import SideNav from './SideNav';

// Routes that render their own page-level chrome and skip the mobile TopNav.
function isHeaderlessRoute(pathname: string): boolean {
  if (pathname.endsWith('/chat') && pathname !== '/chat') return true;
  if (pathname.startsWith('/chat/') && pathname !== '/chat') return true;
  return (
    pathname === '/bits' ||
    pathname === '/post' ||
    pathname === '/post/new' ||
    pathname === '/bits/new' ||
    pathname === '/find'
  );
}

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const isAuthPage = pathname === '/login' || pathname === '/reset-password';
  const isChatPage =
    pathname.endsWith('/chat') || (pathname.includes('/chat/') && pathname !== '/chat');
  const headerless = isHeaderlessRoute(pathname);

  // Mobile top padding only when TopNav is shown
  const topPad = !isAuthPage && !headerless ? 'pt-14 md:pt-0' : '';
  const bottomPad = !isAuthPage && !isChatPage ? 'pb-24 md:pb-8' : '';

  return (
    <div className="min-h-screen w-full flex bg-surface-muted">
      {/* SideNav — desktop */}
      {!isAuthPage && <SideNav />}

      <div className={`flex-1 min-w-0 w-full ${!isAuthPage ? 'md:ml-64' : ''}`}>
        {/* TopNav — mobile only */}
        {!isAuthPage && <TopNav />}

        <div className={`${topPad} ${bottomPad}`}>{children}</div>
      </div>

      {/* BottomNav — mobile only */}
      {!isAuthPage && <BottomNav />}
    </div>
  );
}
