'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';

type GigStatus = 'open' | 'booked' | 'closed' | string;

type Gig = {
  id: string;
  organizer_id: string;
  title: string | null;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  status: GigStatus;
  created_at: string;
  budget_min: number | null;
  budget_max: number | null;
};

type Filter = 'all' | 'open' | 'booked' | 'closed';

export default function OrganizerGigsPage() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    loadGigs();
  }, []);

  async function loadGigs() {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('You must be logged in to view your gigs.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('gigs')
      .select(
        `
        id,
        organizer_id,
        title,
        event_date,
        event_time,
        location,
        status,
        created_at,
        budget_min,
        budget_max
      `
      )
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setError('Failed to load gigs.');
      setLoading(false);
      return;
    }

    setGigs((data ?? []) as Gig[]);
    setLoading(false);
  }

  async function updateGigStatus(id: string, status: GigStatus) {
    setActionId(id);

    const { error } = await supabase
      .from('gigs')
      .update({ status })
      .eq('id', id);

    if (error) {
      setError('Failed to update gig status.');
      setActionId(null);
      return;
    }

    setGigs((prev) => prev.map((g) => (g.id === id ? { ...g, status } : g)));
    setActionId(null);
  }

  const filteredGigs =
    filter === 'all' ? gigs : gigs.filter((g) => g.status === filter);

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      {/* TOP HEADER */}
      <div className="border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                Your Gigs
              </h1>
              <p className="text-xs text-slate-500 sm:text-sm mt-1">
                Manage openings, publish new gigs, and track applications.
              </p>
            </div>

            <Link
              href="/gigs/create"
              className="hidden sm:inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black transition"
            >
              + Create gig
            </Link>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <FilterChip
            label="All"
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <FilterChip
            label="Open"
            active={filter === 'open'}
            onClick={() => setFilter('open')}
          />
          <FilterChip
            label="Booked"
            active={filter === 'booked'}
            onClick={() => setFilter('booked')}
          />
          <FilterChip
            label="Closed"
            active={filter === 'closed'}
            onClick={() => setFilter('closed')}
          />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* STATES */}
        {loading && (
          <p className="text-slate-500 text-sm py-10">Loading gigs…</p>
        )}
        {error && (
          <p className="text-red-600 text-sm py-10">{error}</p>
        )}

        {!loading && filteredGigs.length === 0 && (
          <div className="py-16 text-center text-slate-500">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-slate-200/60" />
            <h2 className="text-base font-medium text-slate-700">
              No gigs found
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Try switching filters or create a new gig.
            </p>

            <Link
              href="/gigs/create"
              className="inline-flex mt-6 rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              + Create gig
            </Link>
          </div>
        )}

        {/* GIG LIST */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {filteredGigs.map((gig) => (
            <div
              key={gig.id}
              className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow transition"
            >
              {/* Top banner strip */}
              <div className="h-2 w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" />

              <div className="p-5 space-y-3">
                {/* TITLE */}
                <Link
                  href={`/gigs/${gig.id}`}
                  className="block text-lg font-semibold text-slate-900 group-hover:underline"
                >
                  {gig.title ?? 'Untitled gig'}
                </Link>

                {/* DATE + LOCATION */}
                <p className="text-sm text-slate-600">
                  {gig.location || 'Location TBD'}
                  {' · '}
                  {gig.event_date
                    ? new Date(gig.event_date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Date TBD'}
                  {gig.event_time && ` · ${gig.event_time}`}
                </p>

                {/* BUDGET */}
                {(gig.budget_min !== null || gig.budget_max !== null) && (
                  <p className="text-xs text-slate-500">
                    Budget:{' '}
                    {gig.budget_min ? `$${gig.budget_min}` : 'TBD'}
                    {gig.budget_max ? ` – $${gig.budget_max}` : ''}
                  </p>
                )}

                {/* STATUS + CREATED */}
                <div className="flex items-center gap-2 pt-2">
                  <StatusBadge status={gig.status} />
                  <span className="text-[11px] text-slate-400">
                    Created{' '}
                    {new Date(gig.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* ACTIONS */}
                <div className="pt-4 flex items-center justify-between">
                  <div className="text-xs flex gap-2">
                    {gig.status === 'open' && (
                      <button
                        onClick={() => updateGigStatus(gig.id, 'closed')}
                        disabled={actionId === gig.id}
                        className="px-3 py-1 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
                      >
                        {actionId === gig.id ? 'Updating…' : 'Close'}
                      </button>
                    )}

                    {gig.status === 'booked' && (
                      <button
                        onClick={() => updateGigStatus(gig.id, 'closed')}
                        disabled={actionId === gig.id}
                        className="px-3 py-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50"
                      >
                        {actionId === gig.id ? 'Updating…' : 'Complete'}
                      </button>
                    )}

                    {gig.status === 'closed' && (
                      <button
                        onClick={() => updateGigStatus(gig.id, 'open')}
                        disabled={actionId === gig.id}
                        className="px-3 py-1 rounded-full border border-blue-300 text-blue-700 hover:bg-blue-50 transition disabled:opacity-50"
                      >
                        {actionId === gig.id ? 'Updating…' : 'Reopen'}
                      </button>
                    )}
                  </div>

                  <Link
                    href={`/gigs/${gig.id}`}
                    className="text-sm font-medium text-slate-700 hover:underline"
                  >
                    View →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FLOATING CREATE BUTTON (mobile) */}
        <Link
          href="/gigs/create"
          className="fixed bottom-6 right-6 sm:hidden rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-black"
        >
          + Create gig
        </Link>
      </div>
    </main>
  );
}

/* FILTER CHIP */
function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full border text-sm transition whitespace-nowrap ${
        active
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
      }`}
    >
      {label}
    </button>
  );
}

/* STATUS BADGE */
function StatusBadge({ status }: { status: GigStatus }) {
  let label = status;
  let classes =
    'bg-slate-200 text-slate-700 border-slate-300';

  if (status === 'open') {
    label = 'Open';
    classes = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  } else if (status === 'booked') {
    label = 'Booked';
    classes = 'bg-amber-100 text-amber-800 border-amber-200';
  } else if (status === 'closed') {
    label = 'Closed';
    classes = 'bg-slate-300 text-slate-700 border-slate-400';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-medium ${classes}`}
    >
      {label}
    </span>
  );
}
