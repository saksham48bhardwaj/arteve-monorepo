'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ApplicationsList from '@/components/gigs/ApplicationsList';
import BookingsList from '@/components/gigs/BookingsList';
import { Button, Spinner, Tabs } from '@arteve/ui/components';

type TabValue = 'applications' | 'bookings';

export default function MyGigsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <MyGigsContent />
    </Suspense>
  );
}

function MyGigsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: TabValue = (searchParams.get('tab') as TabValue) || 'applications';

  function setTab(next: TabValue) {
    router.replace(`/gigs?tab=${next}`);
  }

  return (
    <main className="w-full mx-auto pb-8" style={{ maxWidth: 720 }}>
      <div className="px-4 md:px-6 pt-5 pb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="page-title !text-xl md:!text-2xl">My gigs</h1>
          <p className="page-subtitle">Track applications and confirmed bookings.</p>
        </div>
        <Link href="/find?tab=gigs">
          <Button size="sm" variant="outline">Find gigs</Button>
        </Link>
      </div>

      <div className="px-4 md:px-6">
        <Tabs<TabValue>
          value={tab}
          onChange={setTab}
          items={[
            { value: 'applications', label: 'Applications' },
            { value: 'bookings', label: 'Bookings' },
          ]}
        />
      </div>

      <div className="px-4 md:px-6 pt-4">
        {tab === 'applications' && <ApplicationsList />}
        {tab === 'bookings' && <BookingsList />}
      </div>
    </main>
  );
}

function Loading() {
  return (
    <main className="px-4 py-6">
      <div className="flex items-center gap-2 text-sm text-ink-subtle">
        <Spinner size={14} /> Loading…
      </div>
    </main>
  );
}
