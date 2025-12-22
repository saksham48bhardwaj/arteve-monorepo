'use client';

import BookingsList from '@/components/gigs/BookingsList';

export default function MusicianBookingsPage() {
  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">My Bookings</h1>
        <p className="text-sm text-gray-600">
          Bookings you’ve confirmed with organizers.
        </p>
      </header>

      <BookingsList />
    </main>
  );
}
