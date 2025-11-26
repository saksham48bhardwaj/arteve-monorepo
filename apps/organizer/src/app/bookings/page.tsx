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
  musician_name: string | null;
  musician_avatar_url: string | null;
};

type BookingRow = {
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
  status: string;
  created_at: string;
  updated_at: string;
  event_time: string | null;
  musician: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  }[] | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled',
  canceled_by_organizer: 'Cancelled by organizer',
  canceled_by_musician: 'Cancelled by musician',
  completed: 'Completed',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-200 text-gray-800',
  canceled_by_organizer: 'bg-gray-200 text-gray-800',
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
export default function OrganizerBookingsPage() {
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
      const organizerId = auth?.user?.id;

      if (!organizerId) {
        setBookings([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('bookings')
        .select(`
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
          event_time,
          musician:profiles!bookings_musician_id_fkey (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('organizer_id', organizerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading bookings:', error);
        setBookings([]);
        setLoading(false);
        return;
      }

      const mapped = (data as BookingRow[]).map((row) => ({
        id: row.id,
        musician_id: row.musician_id,
        organizer_id: row.organizer_id,
        organizer_name: row.organizer_name,
        organizer_email: row.organizer_email,
        event_title: row.event_title,
        event_date: row.event_date,
        location: row.location,
        budget_min: row.budget_min,
        budget_max: row.budget_max,
        message: row.message,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        event_time: row.event_time,
        musician_name: row.musician?.[0]?.display_name ?? 'Unknown',
        musician_avatar_url: row.musician?.[0]?.avatar_url ?? null,
      }));

      setBookings(mapped);
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
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      {/* HEADER */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Bookings</h1>
          <p className="text-sm text-gray-600">
            View and manage all bookings created from your gigs.
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

      {/* EMPTY STATE */}
      {!loading && filtered.length === 0 && (
        <p className="text-sm text-gray-500">No bookings found.</p>
      )}

      {/* BOOKING LIST */}
      <div className="space-y-3">
        {filtered.map((b) => (
          <Link
            key={b.id}
            href={`/bookings/${b.id}`}
            className="block border rounded-xl p-4 hover:bg-gray-50 transition"
          >
            <div className="flex justify-between items-center gap-4">
              {/* Left side */}
              <div className="flex items-center gap-3">
                <img
                  src={b.musician_avatar_url ?? '/default-avatar.png'}
                  className="w-10 h-10 rounded-full object-cover"
                  alt={b.musician_name ?? 'Musician'}
                />

                <div>
                  <p className="text-sm text-gray-500">{b.musician_name}</p>
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
                    <p className="text-xs text-gray-500">
                      Budget:{' '}
                      {b.budget_min ? `$${b.budget_min}` : 'TBD'}
                      {b.budget_max ? ` – $${b.budget_max}` : ''}
                    </p>
                  )}
                </div>
              </div>

              {/* Status pill */}
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
