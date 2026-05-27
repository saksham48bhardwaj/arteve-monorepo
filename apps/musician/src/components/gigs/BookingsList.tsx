'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import { Badge, EmptyState, Spinner } from '@arteve/ui/components';

type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'canceled_by_organizer'
  | 'canceled_by_musician'
  | 'completed';

type Booking = {
  id: string;
  musician_id: string;
  organizer_id: string;
  organizer_name: string | null;
  organizer_email: string | null;
  event_title: string;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  message: string | null;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled',
  canceled_by_organizer: 'Cancelled by organizer',
  canceled_by_musician: 'Cancelled by you',
  completed: 'Completed',
};
const STATUS_TONE: Record<BookingStatus, 'warning' | 'success' | 'danger' | 'neutral' | 'brand'> = {
  pending: 'warning',
  accepted: 'success',
  declined: 'danger',
  cancelled: 'neutral',
  canceled_by_organizer: 'neutral',
  canceled_by_musician: 'neutral',
  completed: 'brand',
};

const FILTERS: { value: 'all' | BookingStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
];

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BookingsList() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | BookingStatus>('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const musicianId = auth?.user?.id;
      if (!musicianId) { setBookings([]); setLoading(false); return; }

      const { data, error } = await supabase
        .from('bookings')
        .select(`id, musician_id, organizer_id, organizer_name, organizer_email,
                 event_title, event_date, event_time, location,
                 budget_min, budget_max, message, status, created_at, updated_at`)
        .eq('musician_id', musicianId)
        .order('created_at', { ascending: false });
      if (error) { console.error(error); setBookings([]); }
      else setBookings((data ?? []) as Booking[]);
      setLoading(false);
    })();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: bookings.length };
    bookings.forEach((b) => { c[b.status] = (c[b.status] ?? 0) + 1; });
    return c;
  }, [bookings]);

  const filtered = useMemo(
    () => (filter === 'all' ? bookings : bookings.filter((b) => b.status === filter)),
    [bookings, filter],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-subtle py-4">
        <Spinner size={14} /> Loading bookings…
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        title="No bookings yet"
        description="When organizers book you for a gig, the details show up here."
      />
    );
  }

  return (
    <>
      {/* Filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          const count = counts[f.value] ?? 0;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`shrink-0 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                active
                  ? 'bg-brand text-white shadow-sm'
                  : 'border border-line-strong text-ink-muted hover:bg-surface-sunken hover:text-ink'
              }`}
            >
              {f.label}
              {count > 0 && (
                <span className="ml-1.5 tabular text-[11px] opacity-90">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-ink-subtle py-6 text-center">No {filter} bookings.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((b) => {
            const date = formatDate(b.event_date);
            return (
              <li key={b.id}>
                <Link href={`/bookings/${b.id}`} className="block card card-padded card-hover">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-[11px] text-ink-subtle truncate">
                        {b.organizer_name ?? b.organizer_email ?? 'Organizer'}
                      </p>
                      <h3 className="text-base font-semibold text-ink-strong leading-tight truncate">
                        {b.event_title}
                      </h3>
                    </div>
                    <Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
                    {date && (
                      <span className="inline-flex items-center gap-1 tabular">
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 10h18M9 3v4M15 3v4" />
                        </svg>
                        {date}
                      </span>
                    )}
                    {b.location && (
                      <span className="inline-flex items-center gap-1">
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-9 8-14a8 8 0 0 0-16 0c0 5 8 14 8 14z" /><circle cx="12" cy="8" r="3" />
                        </svg>
                        {b.location}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
