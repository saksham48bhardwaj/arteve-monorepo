'use client';

import { usePathname } from 'next/navigation';
import TopNav from './TopNav';
import BottomNav from './BottomNav';
import SideNav from './SideNav';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage =
  pathname === '/login' ||
  pathname === '/reset-password';

  const isChatPage = pathname?.endsWith('/chat') && pathname !== '/chat';

  return (
    <div className="min-h-screen w-full flex">
      
      {/* SIDENAV (Desktop) */}
      {!isAuthPage && (
        <aside className="hidden md:flex fixed top-0 left-0 h-screen w-64 border-neutral-200 bg-white z-40">
          <SideNav />
        </aside>
      )}

      {/* MAIN CONTENT AREA */}
      <div className={`flex-1 w-full ${!isAuthPage ? 'md:ml-64' : ''}`}>
        
        {/* Top Nav (Mobile only) */}
        {!isAuthPage && (
          <div className="md:hidden fixed top-0 left-0 w-full z-50 bg-white">
            <TopNav />
          </div>
        )}

        {/* Page content (children) */}
        <div className={`${!isAuthPage && !isChatPage ? 'pt-14 md:pt-0 pb-20' : ''}`}>
          {children}
        </div>
      </div>

      {/* Bottom Nav (Mobile only) */}
      {!isAuthPage && (
        <div className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-white">
          <BottomNav />
        </div>
      )}
    </div>
  );
}
