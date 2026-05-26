'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ApplicationsList from '@/components/gigs/ApplicationsList';
import BookingsList from '@/components/gigs/BookingsList';

export default function MyGigsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <MyGigsContent />
    </Suspense>
  );
}

function MyGigsContent() {
  const tab = useSearchParams().get('tab') ?? 'applications';

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-8">
      <header>
        <p className="text-xs uppercase tracking-wide text-brand">
          Musician · My Gigs
        </p>
        <h1 className="text-3xl font-bold">My Gigs</h1>
        <p className="text-ink-subtle">
          Track applications and confirmed bookings.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-6 border-b">
        <Tab href="/gigs?tab=applications" active={tab === 'applications'}>
          Applications
        </Tab>
        <Tab href="/gigs?tab=bookings" active={tab === 'bookings'}>
          Bookings
        </Tab>
      </div>

      {/* Content */}
      {tab === 'applications' && <ApplicationsList />}
      {tab === 'bookings' && <BookingsList />}
    </main>
  );
}

function Loading() {
  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6">
      <p className="text-ink-subtle">Loading gigs…</p>
    </main>
  );
}

interface TabProps {
  href: string;
  active: boolean;
  children: React.ReactNode;
}

function Tab({ href, active, children }: TabProps) {
  return (
    <a
      href={href}
      className={`pb-2 text-sm font-medium border-b-2 ${
        active
          ? 'border-brand text-brand-700'
          : 'border-transparent text-ink-subtle'
      }`}
    >
      {children}
    </a>
  );
}
