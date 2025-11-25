'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';
import type { Gig } from '@arteve/shared/types/gig';

type ApplicationCount = {
  count: number | null;
};

export default function OrganizerGigDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [gig, setGig] = useState<Gig | null>(null);
  const [appsCount, setAppsCount] = useState<number>(0);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Load gig + applications count + any booking
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch gig
      const { data: g, error: gigErr } = await supabase
        .from('gigs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (gigErr || !g) {
        setGig(null);
        setLoading(false);
        return;
      }

      setGig(g as Gig);

      // Count applications
      const { count } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('gig_id', id);

      setAppsCount(count ?? 0);

      // Check if booking exists for this gig
      const { data: b } = await supabase
        .from('bookings')
        .select('id')
        .eq('event_title', g.title)
        .eq('organizer_id', user.id)
        .limit(1);

      if (b && b.length > 0) {
        setBookingId(b[0].id);
      }

      setLoading(false);
    }

    load();
  }, [id, router]);

  async function closeGig() {
    setFeedback(null);

    const { error } = await supabase
      .from('gigs')
      .update({ status: 'closed' })
      .eq('id', id);

    if (error) {
      setFeedback('Failed to close gig.');
      return;
    }

    setGig((prev) => prev ? { ...prev, status: 'closed' } : prev);
    setFeedback('Gig closed successfully.');
  }

  async function reopenGig() {
    setFeedback(null);

    const { error } = await supabase
      .from('gigs')
      .update({ status: 'open' })
      .eq('id', id);

    if (error) {
      setFeedback('Failed to reopen gig.');
      return;
    }

    setGig((prev) => prev ? { ...prev, status: 'open' } : prev);
    setFeedback('Gig reopened.');
  }

  if (loading) return <main className="p-6">Loading gig…</main>;
  if (!gig) return <main className="p-6">Gig not found.</main>;

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <section className="space-y-1">
        <p className="text-xs text-gray-400">Gig ID: {gig.id.slice(0, 10)}…</p>
        <h1 className="text-2xl font-semibold">{gig.title ?? 'Untitled gig'}</h1>

        <p className="text-sm text-gray-600">
          Status: <span className="font-medium">{gig.status}</span>
        </p>

        {gig.location && (
          <p className="text-sm text-gray-600">{gig.location}</p>
        )}

        {(gig.event_date || gig.event_time) && (
          <p className="text-sm text-gray-600">
            {gig.event_date ? new Date(gig.event_date).toLocaleDateString() : ''}{' '}
            {gig.event_time ? `• ${gig.event_time}` : ''}
          </p>
        )}

        {(gig.budget_min !== null || gig.budget_max !== null) && (
          <p className="text-sm text-gray-600">
            Budget:{' '}
            {gig.budget_min !== null ? `$${gig.budget_min}` : 'TBD'}
            {gig.budget_max !== null ? ` – $${gig.budget_max}` : ''}
          </p>
        )}

        {gig.genres && gig.genres.length > 0 && (
          <p className="text-sm text-gray-600">
            Genres: {gig.genres.join(', ')}
          </p>
        )}
      </section>

      {gig.description && (
        <section className="space-y-1">
          <h2 className="font-medium">Description</h2>
          <p className="text-gray-800 whitespace-pre-line">{gig.description}</p>
        </section>
      )}

      <section className="border-t pt-4 space-y-3">
        <h2 className="font-medium">Management</h2>

        <p className="text-sm text-gray-600">
          Applications received: <strong>{appsCount}</strong>
        </p>

        {bookingId && (
          <p className="text-sm text-green-600">
            Booking created —{' '}
            <a
              href={`/bookings/${bookingId}/chat`}
              className="underline"
            >
              Go to booking chat
            </a>
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <a
            href={`/gigs/${gig.id}/applications`}
            className="px-4 py-2 text-sm rounded-xl border"
          >
            View applications
          </a>

          <a
            href={`/gigs/${gig.id}/edit`}
            className="px-4 py-2 text-sm rounded-xl border"
          >
            Edit gig
          </a>

          {gig.status === 'open' ? (
            <button
              onClick={closeGig}
              className="px-4 py-2 text-sm rounded-xl border bg-red-50 text-red-700"
            >
              Close gig
            </button>
          ) : (
            <button
              onClick={reopenGig}
              className="px-4 py-2 text-sm rounded-xl border bg-green-50 text-green-700"
            >
              Reopen gig
            </button>
          )}
        </div>

        {feedback && (
          <p className="text-sm text-gray-700">{feedback}</p>
        )}
      </section>
    </main>
  );
}
