'use client';

import { usePathname } from 'next/navigation';
import TopNav from './TopNav';
import BottomNav from './BottomNav';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <>
      {!isLoginPage && (
        <div className="relative z-50">
          <TopNav />
        </div>
      )}

      <main className="relative z-10 mx-auto w-full max-w-xl px-4 pb-24 pt-4">
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
