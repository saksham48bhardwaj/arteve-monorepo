'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';

type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
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

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

function statusLabel(status: BookingStatus): string {
  return STATUS_LABEL[status] ?? status;
}

function statusClasses(status: BookingStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'accepted':
      return 'bg-green-100 text-green-800';
    case 'declined':
      return 'bg-red-100 text-red-800';
    case 'cancelled':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function MusicianBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | BookingStatus>('all');

  useEffect(() => {
    async function load() {
      setLoading(true);

      const {
        data: auth,
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr || !auth.user) {
        setBookings([]);
        setLoading(false);
        return;
      }

      const musicianId = auth.user.id;

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

      setBookings((data ?? []) as Booking[]);
      setLoading(false);
    }

    load();
  }, []);

  const filteredBookings =
    filter === 'all'
      ? bookings
      : bookings.filter((b) => b.status === filter);

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">My Bookings</h1>
          <p className="text-sm text-gray-500">
            Bookings you&apos;ve confirmed with organizers.
          </p>
        </div>

        <div className="flex gap-2 text-sm">
          {(['all', 'pending', 'accepted', 'declined', 'cancelled'] as const).map(
            (statusKey) => (
              <button
                key={statusKey}
                onClick={() => setFilter(statusKey)}
                className={`px-3 py-1 rounded-full border ${
                  filter === statusKey
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-700'
                }`}
              >
                {statusKey === 'all' ? 'All' : statusLabel(statusKey)}
              </button>
            )
          )}
        </div>
      </header>

      {loading && <p>Loading bookings…</p>}

      {!loading && filteredBookings.length === 0 && (
        <p className="text-sm text-gray-500">No bookings yet.</p>
      )}

      <div className="space-y-3">
        {filteredBookings.map((b) => (
          <Link
            key={b.id}
            href={`/bookings/${b.id}`}
            className="block border rounded-xl px-4 py-3 hover:bg-gray-50 transition"
          >
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="text-xs text-gray-500">
                  {b.organizer_name ?? 'Organizer'}
                  {b.organizer_email ? ` · ${b.organizer_email}` : ''}
                </p>
                <p className="font-medium">{b.event_title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {b.event_date &&
                    new Date(b.event_date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  {b.location ? ` · ${b.location}` : ''}
                </p>
                {b.budget_min !== null && b.budget_max !== null && (
                  <p className="text-xs text-gray-500 mt-1">
                    Budget: ${b.budget_min}–${b.budget_max}
                  </p>
                )}
              </div>

              <span
                className={`text-xs px-2 py-1 rounded-full ${statusClasses(
                  b.status
                )}`}
              >
                {statusLabel(b.status)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
