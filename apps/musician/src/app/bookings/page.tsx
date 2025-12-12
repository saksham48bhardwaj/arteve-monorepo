'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';

/* ------------------------------------
   TYPES
------------------------------------ */
type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'canceled_by_organizer'
  | 'canceled_by_musician'
  | 'completed'
  | string;

type Booking = {
  id: string;
  musician_id: string;
  organizer_id: string;
  organizer_name: string | null;
  organizer_email: string | null;
  event_title: string;
  event_date: string;
  location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  message: string | null;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
  event_time: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled',
  canceled_by_organizer: 'Cancelled by organizer',
  canceled_by_musician: 'Cancelled by you',
  completed: 'Completed',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-700',
  canceled_by_organizer: 'bg-gray-100 text-gray-700',
  canceled_by_musician: 'bg-gray-200 text-gray-800',
  completed: 'bg-blue-100 text-blue-800',
};

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function getStatusClass(status: string): string {
  return STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-800';
}

/* ------------------------------------
   COMPONENT
------------------------------------ */
export default function MusicianBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    'all' | Exclude<BookingStatus, 'all'>
  >('all');

  /* LOAD BOOKINGS */
  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const musicianId = auth?.user?.id;

      if (!musicianId) {
        setBookings([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('bookings')
        .select(
          `
          id,
          musician_id,
          organizer_id,
          organizer_name,
          organizer_email,
          event_title,
          event_date,
          location,
          budget_min,
          budget_max,
          message,
          status,
          created_at,
          updated_at,
          event_time
        `
        )
        .eq('musician_id', musicianId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading bookings:', error);
        setBookings([]);
        setLoading(false);
        return;
      }

      setBookings(data as Booking[]);
      setLoading(false);
    }

    load();
  }, []);

  const filtered = filter === 'all'
    ? bookings
    : bookings.filter((b) => b.status === filter);

  /* ------------------------------------
     RENDER
  ------------------------------------ */
  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      {/* HEADER */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My Bookings</h1>
          <p className="text-sm text-gray-600">
            Bookings you’ve confirmed with organizers.
          </p>
        </div>
      </header>

      {/* FILTERS */}
      <div className="flex gap-2 overflow-x-auto pb-2 text-sm">
        {(['all', 'pending', 'accepted', 'declined', 'cancelled', 'completed'] as const).map(
          (key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-1 rounded-full border whitespace-nowrap ${
                filter === key
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-700'
              }`}
            >
              {key === 'all' ? 'All' : getStatusLabel(key)}
            </button>
          )
        )}
      </div>

      {/* LOADING */}
      {loading && <p className="text-sm text-gray-600">Loading bookings…</p>}

      {/* EMPTY */}
      {!loading && filtered.length === 0 && (
        <p className="text-sm text-gray-500">No bookings yet.</p>
      )}

      {/* BOOKINGS LIST */}
      <div className="space-y-3">
        {filtered.map((b) => (
          <Link
            key={b.id}
            href={`/bookings/${b.id}`}
            className="block border rounded-xl p-4 hover:bg-gray-50 transition"
          >
            <div className="flex justify-between items-center gap-4">

              {/* LEFT SECTION */}
              <div>
                <p className="text-xs text-gray-500">
                  {b.organizer_name ?? 'Organizer'}
                  {b.organizer_email ? ` · ${b.organizer_email}` : ''}
                </p>

                <p className="font-semibold">{b.event_title}</p>

                <p className="text-xs text-gray-500 mt-1">
                  {b.event_date &&
                    new Date(b.event_date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  {b.location ? ` · ${b.location}` : ''}
                </p>

                {(b.budget_min !== null || b.budget_max !== null) && (
                  <p className="text-xs text-gray-500 mt-1">
                    Budget:{' '}
                    {b.budget_min ? `$${b.budget_min}` : 'TBD'}
                    {b.budget_max ? ` – $${b.budget_max}` : ''}
                  </p>
                )}
              </div>

              {/* STATUS */}
              <span
                className={`text-xs px-2 py-1 rounded-full ${getStatusClass(
                  b.status
                )}`}
              >
                {getStatusLabel(b.status)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
