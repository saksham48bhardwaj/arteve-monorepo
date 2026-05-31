'use client';

import { usePathname } from 'next/navigation';
import TopNav from './TopNav';
import BottomNav from './BottomNav';
import SideNav from './SideNav';
import RoleGuard from './RoleGuard';
import { ToastViewport } from '@arteve/ui/components';

function isHeaderlessRoute(pathname: string): boolean {
  if (pathname.endsWith('/chat') && pathname !== '/chat') return true;
  if (pathname.startsWith('/chat/') && pathname !== '/chat') return true;
  return pathname === '/find' || pathname === '/gigs/create';
}

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const isAuthPage = pathname === '/login' || pathname === '/reset-password';
  const isChatPage = pathname.endsWith('/chat') && pathname !== '/chat';
  const headerless = isHeaderlessRoute(pathname);

  const topPad = !isAuthPage && !headerless ? 'pt-14 md:pt-0' : '';
  const bottomPad = !isAuthPage && !isChatPage ? 'pb-24 md:pb-8' : '';

  return (
    <div className="min-h-screen w-full flex bg-surface-muted">
      {/* Enforce single-role accounts (organizer app) */}
      <RoleGuard />

      {!isAuthPage && <SideNav />}

      <div className={`flex-1 min-w-0 w-full ${!isAuthPage ? 'md:ml-64' : ''}`}>
        {!isAuthPage && <TopNav />}

        <div className={`${topPad} ${bottomPad}`}>{children}</div>
      </div>

      {!isAuthPage && <BottomNav />}

      <ToastViewport />
    </div>
  );
}
