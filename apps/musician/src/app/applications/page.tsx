'use client';

import ApplicationsList from '@/components/gigs/ApplicationsList';

export default function MyApplicationsPage() {
  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      <h1 className="text-2xl font-semibold">My Applications</h1>
      <ApplicationsList />
    </main>
  );
}
