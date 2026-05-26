'use client';

import { usePathname } from 'next/navigation';
import TopNav from './TopNav';
import BottomNav from './BottomNav';
import SideNav from './SideNav';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const isAuthPage = pathname === '/login' || pathname === '/reset-password';
  const isChatPage = pathname.endsWith('/chat') && pathname !== '/chat';

  return (
    <div className="min-h-screen w-full flex bg-surface-muted">
      {!isAuthPage && <SideNav />}

      <div className={`flex-1 min-w-0 w-full ${!isAuthPage ? 'md:ml-64' : ''}`}>
        {!isAuthPage && <TopNav />}

        <div className={!isAuthPage && !isChatPage ? 'pt-14 md:pt-0 pb-24 md:pb-8' : ''}>
          {children}
        </div>
      </div>

      {!isAuthPage && <BottomNav />}
    </div>
  );
}
