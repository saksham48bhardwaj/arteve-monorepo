'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';
import type { Gig } from '@arteve/shared/types/gig';

export default function OrganizerGigDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [gig, setGig] = useState<Gig | null>(null);
  const [appsCount, setAppsCount] = useState<number>(0);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // Load gig
      const { data: g } = await supabase
        .from('gigs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!g) {
        setGig(null);
        setLoading(false);
        return;
      }

      setGig(g as Gig);

      // Application count
      const { count } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('gig_id', id);

      setAppsCount(count ?? 0);

      // Booking check
      const { data: b } = await supabase
        .from('bookings')
        .select('id')
        .eq('organizer_id', user.id)
        .eq('event_title', g.title)
        .limit(1);

      if (b && b.length > 0) setBookingId(b[0].id);

      setLoading(false);
    }

    load();
  }, [id, router]);

  async function closeGig() {
    const { error } = await supabase
      .from('gigs')
      .update({ status: 'closed' })
      .eq('id', id);

    if (error) return setFeedback('Failed to close gig.');
    setGig((prev) => (prev ? { ...prev, status: 'closed' } : prev));
    setFeedback('Gig closed successfully.');
  }

  async function reopenGig() {
    const { error } = await supabase
      .from('gigs')
      .update({ status: 'open' })
      .eq('id', id);

    if (error) return setFeedback('Failed to reopen gig.');
    setGig((prev) => (prev ? { ...prev, status: 'open' } : prev));
    setFeedback('Gig reopened.');
  }

  if (loading)
    return (
      <main className="p-10 text-slate-500">Loading gig…</main>
    );

  if (!gig)
    return (
      <main className="p-10 text-slate-500">Gig not found.</main>
    );

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      {/* HEADER */}
      <div className="border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500">
                Gig ID: {gig.id.slice(0, 10)}…
              </p>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
                {gig.title ?? 'Untitled gig'}
              </h1>
              <div className="mt-2">
                <GigStatusBadge status={gig.status} />
              </div>
            </div>

            <a
              href={`/gigs/${gig.id}/edit`}
              className="hidden sm:inline-flex rounded-full bg-slate-900 px-4 py-2 text-white text-sm font-semibold hover:bg-black"
            >
              Edit gig
            </a>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-10 pt-10">

        {/* EVENT INFO CARD */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-2 w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" />

          <div className="p-6 sm:p-8 space-y-6">
            {/* DATE / LOCATION / BUDGET */}
            <div className="text-sm space-y-1 text-slate-700">
              {gig.location && (
                <p className="text-base text-slate-900 font-medium">
                  📍 {gig.location}
                </p>
              )}

              {(gig.event_date || gig.event_time) && (
                <p>
                  📅{' '}
                  {gig.event_date
                    ? new Date(gig.event_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Date TBD'}
                  {gig.event_time && ` · ${gig.event_time}`}
                </p>
              )}

              {(gig.budget_min !== null || gig.budget_max !== null) && (
                <p>
                  💰 Budget:{' '}
                  {gig.budget_min !== null ? `$${gig.budget_min}` : 'TBD'}
                  {gig.budget_max !== null ? ` – $${gig.budget_max}` : ''}
                </p>
              )}

              {gig.genres && gig.genres.length > 0 && (
                <p className="text-sm text-slate-600">
                  🎵 Genres: {gig.genres.join(', ')}
                </p>
              )}
            </div>

            {/* DESCRIPTION */}
            {gig.description && (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  Description
                </h2>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                  {gig.description}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* MANAGEMENT CARD */}
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 sm:p-8 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Management
          </h2>

          {/* APPLICATIONS */}
          <div className="space-y-1 text-sm">
            <p className="text-slate-700">
              Applications received:{' '}
              <span className="font-semibold">{appsCount}</span>
            </p>

            {bookingId && (
              <p className="text-emerald-700 text-sm">
                Booking created —{' '}
                <a
                  href={`/bookings/${bookingId}/chat`}
                  className="underline"
                >
                  Open booking chat
                </a>
              </p>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href={`/gigs/${gig.id}/applications`}
              className="px-4 py-2 rounded-full border border-slate-300 text-sm hover:bg-slate-100"
            >
              View applications
            </a>

            <a
              href={`/gigs/${gig.id}/edit`}
              className="px-4 py-2 rounded-full border border-slate-300 text-sm hover:bg-slate-100"
            >
              Edit gig
            </a>

            {gig.status === 'open' ? (
              <button
                onClick={closeGig}
                className="px-4 py-2 rounded-full bg-red-50 text-red-700 border border-red-200 text-sm"
              >
                Close gig
              </button>
            ) : (
              <button
                onClick={reopenGig}
                className="px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm"
              >
                Reopen gig
              </button>
            )}
          </div>

          {feedback && (
            <p className="text-sm text-slate-600 pt-2">{feedback}</p>
          )}
        </section>
      </div>
    </main>
  );
}

/* PREMIUM STATUS BADGE */
function GigStatusBadge({ status }: { status: string }) {
  let label = status;
  let classes =
    'bg-slate-200 text-slate-700 border border-slate-300';

  if (status === 'open') {
    label = 'Open for applications';
    classes =
      'bg-emerald-100 text-emerald-800 border border-emerald-200';
  } else if (status === 'booked') {
    label = 'Booked';
    classes = 'bg-amber-100 text-amber-800 border border-amber-200';
  } else if (status === 'closed') {
    label = 'Closed';
    classes = 'bg-slate-300 text-slate-700 border border-slate-400';
  }

  return (
    <span
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  );
}
