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
      console.error(error);
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
      console.error(error);
      setError('Failed to update gig status.');
      setActionId(null);
      return;
    }

    setGigs((prev) =>
      prev.map((g) => (g.id === id ? { ...g, status } : g))
    );
    setActionId(null);
  }

  const filteredGigs =
    filter === 'all'
      ? gigs
      : gigs.filter((g) => g.status === filter);

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My Gigs</h1>
          <p className="text-sm text-gray-600">
            Manage your gigs across their lifecycle: Open → Booked → Closed.
          </p>
        </div>

        <Link
          href="/gigs/create"
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm"
        >
          Create new gig
        </Link>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 text-sm">
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

      {loading && <p className="text-gray-600">Loading gigs…</p>}
      {error && (
        <p className="text-red-600 text-sm">
          {error}
        </p>
      )}

      {!loading && filteredGigs.length === 0 && (
        <p className="text-gray-600 text-sm">
          No gigs found for this filter.
        </p>
      )}

      <div className="space-y-3">
        {filteredGigs.map((gig) => (
          <article
            key={gig.id}
            className="border rounded-2xl p-4 flex items-center justify-between gap-4 hover:bg-gray-50"
          >
            <div className="space-y-1">
              <Link
                href={`/gigs/${gig.id}`}
                className="font-medium hover:underline"
              >
                {gig.title ?? 'Untitled gig'}
              </Link>

              <p className="text-sm text-gray-600">
                {gig.location ?? 'Location TBD'}
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

              {(gig.budget_min !== null || gig.budget_max !== null) && (
                <p className="text-xs text-gray-500">
                  Budget:{' '}
                  {gig.budget_min !== null
                    ? `$${gig.budget_min}`
                    : 'TBD'}
                  {gig.budget_max !== null
                    ? ` – $${gig.budget_max}`
                    : ''}
                </p>
              )}

              <div className="flex items-center gap-2">
                <StatusBadge status={gig.status} />
                <p className="text-[11px] text-gray-400">
                  Created{' '}
                  {new Date(gig.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 text-xs">
              {gig.status === 'open' && (
                <button
                  onClick={() => updateGigStatus(gig.id, 'closed')}
                  disabled={actionId === gig.id}
                  className="px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-60"
                >
                  {actionId === gig.id
                    ? 'Updating…'
                    : 'Close gig'}
                </button>
              )}

              {gig.status === 'booked' && (
                <button
                  onClick={() => updateGigStatus(gig.id, 'closed')}
                  disabled={actionId === gig.id}
                  className="px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {actionId === gig.id
                    ? 'Updating…'
                    : 'Mark completed'}
                </button>
              )}

              {gig.status === 'closed' && (
                <button
                  onClick={() => updateGigStatus(gig.id, 'open')}
                  disabled={actionId === gig.id}
                  className="px-3 py-1 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                >
                  {actionId === gig.id
                    ? 'Updating…'
                    : 'Reopen gig'}
                </button>
              )}

              <Link
                href={`/gigs/${gig.id}`}
                className="text-blue-600 hover:underline"
              >
                View details →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

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
      className={`px-3 py-1 rounded-full border text-xs ${
        active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: GigStatus }) {
  let label = status;
  let classes =
    'bg-gray-100 text-gray-800 border-gray-200';

  if (status === 'open') {
    label = 'Open for applications';
    classes =
      'bg-green-100 text-green-800 border-green-200';
  } else if (status === 'booked') {
    label = 'Booked';
    classes =
      'bg-amber-100 text-amber-800 border-amber-200';
  } else if (status === 'closed') {
    label = 'Closed / Completed';
    classes = 'bg-gray-200 text-gray-800 border-gray-300';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-medium ${classes}`}
    >
      {label}
    </span>
  );
}
