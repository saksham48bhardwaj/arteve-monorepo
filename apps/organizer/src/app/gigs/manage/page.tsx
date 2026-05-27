'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@arteve/ui/components';

/**
 * /gigs/manage is now an alias for /gigs (which is the dashboard).
 * Kept as a route so old links + nav references don't 404.
 */
export default function ManageGigsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/gigs');
  }, [router]);
  return (
    <main className="px-4 py-6">
      <div className="flex items-center gap-3 text-sm text-ink-subtle">
        <Spinner size={14} /> Loading…
      </div>
    </main>
  );
}
