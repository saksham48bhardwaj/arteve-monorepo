'use client';

import { supabase } from '@arteve/supabase/client';
import { useRouter } from 'next/navigation';

export default function LogoutButton({
  className = '',
}: {
  className?: string;
}) {
  const router = useRouter();

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('SIGN OUT ERROR:', err);
    }
  }

  return (
    <button
      onClick={handleSignOut}
      className={`px-4 py-2 rounded-full border text-sm hover:bg-gray-50 ${className}`}
    >
      Sign Out
    </button>
  );
}
