'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@arteve/ui/components';

// Legacy route — canonical URL is /gigs?tab=applications.
export default function LegacyApplicationsMinePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/gigs?tab=applications');
  }, [router]);
  return (
    <main className="page page-narrow flex items-center justify-center">
      <Spinner />
    </main>
  );
}
