'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ApplicationsList from '@/components/gigs/ApplicationsList';
import BookingsList from '@/components/gigs/BookingsList';
import { Button, Skeleton, Tabs } from '@arteve/ui/components';

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
    <main className="w-full mx-auto px-4 py-4" style={{ maxWidth: 720 }}>
      {/* Tab strip skeleton */}
      <div className="flex gap-6 border-b border-line pb-2 mb-3">
        <Skeleton width={80} height={14} />
        <Skeleton width={64} height={14} />
      </div>
      {/* List item skeletons */}
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card card-padded space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton shape="circle" width={36} height={36} />
              <div className="flex-1 space-y-2">
                <Skeleton width="55%" height={14} />
                <Skeleton width="35%" height={12} />
              </div>
              <Skeleton width={64} height={20} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
