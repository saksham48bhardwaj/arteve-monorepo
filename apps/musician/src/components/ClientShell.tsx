'use client';

import { usePathname } from 'next/navigation';
import TopNav from './TopNav';
import BottomNav from './BottomNav';
import SideNav from './SideNav';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <>
      {!isLoginPage && (
        <div className="md:hidden relative z-50">
          <TopNav />
        </div>
      )}
      
      {!isLoginPage && (
        <div className="hidden md:flex relative z-50">
          <SideNav />
        </div>
      )}

     <main className="relative mx-auto max-w-5xl pt-14 md:pt-4 md:pl-56 pb-20">
        {children}
      </main>

      {!isLoginPage && (
        <div className="fixed bottom-0 left-0 w-full z-50">
          <BottomNav />
        </div>
      )}
    </>
  );
}
