'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@arteve/ui/components';

// Legacy route — canonical URL is /gigs?tab=bookings.
// /bookings/[bookingId] (detail) and /bookings/[bookingId]/chat are kept.
export default function LegacyBookingsListPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/gigs?tab=bookings');
  }, [router]);
  return (
    <main className="page page-narrow flex items-center justify-center">
      <Spinner />
    </main>
  );
}
