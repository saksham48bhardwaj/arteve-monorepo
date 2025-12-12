'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import { useMarkNotificationAsRead } from '@arteve/shared/notifications/auto-read';

type GigStatus = 'open' | 'closed' | 'booked' | string;

type Gig = {
  id: string;
  organizer_id: string;
  title: string | null;
  description: string | null;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  genres: string[] | null;
  status: GigStatus;
};

type Organizer = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
};

export default function GigDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const notifId = search.get('notification_id');

  const [gig, setGig] = useState<Gig | null>(null);
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [loading, setLoading] = useState(true);

  useMarkNotificationAsRead(notifId);

  // Load gig + organizer
  useEffect(() => {
    async function load() {
      const { data: g } = await supabase
        .from('gigs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (g) {
        setGig(g as Gig);

        const { data: org } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, location')
          .eq('id', g.organizer_id)
          .maybeSingle();

        if (org) setOrganizer(org as Organizer);
      }

      setLoading(false);
    }

    load();
  }, [id]);

  if (loading) return <main className="p-6">Loading gig…</main>;
  if (!gig) return <main className="p-6">Gig not found.</main>;

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      {/* ================================
          GIG HEADER
      ================================= */}
      <section className="rounded-3xl border border-gray-200 bg-white shadow-sm px-6 py-8 space-y-4">
        <p className="text-xs text-gray-400">
          Gig ID: {gig.id.slice(0, 8)}…
        </p>

        <h1 className="text-3xl font-semibold tracking-tight">
          {gig.title ?? 'Untitled gig'}
        </h1>

        {gig.location && (
          <p className="text-sm text-gray-600">{gig.location}</p>
        )}

        {(gig.event_date || gig.event_time) && (
          <p className="text-sm text-gray-600">
            {gig.event_date &&
              new Date(gig.event_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            {gig.event_time && ` · ${gig.event_time}`}
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
          <div className="flex flex-wrap gap-2 pt-1">
            {gig.genres.map((g) => (
              <span
                key={g}
                className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-700"
              >
                {g}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ================================
          ORGANIZER INFO
      ================================= */}
      {organizer && (
        <section className="rounded-3xl border border-gray-200 bg-white shadow-sm px-6 py-6 flex gap-4 items-center">
          <img
            src={organizer.avatar_url ?? '/placeholder-avatar.png'}
            alt="Organizer"
            className="w-16 h-16 rounded-2xl object-cover border border-gray-200"
          />
          <div className="flex-1 space-y-1">
            <h2 className="text-lg font-semibold">
              {organizer.display_name ?? 'Organizer'}
            </h2>
            {organizer.location && (
              <p className="text-sm text-gray-600">{organizer.location}</p>
            )}
            <Link
              href={`/profile/${organizer.id}`}
              className="text-sm text-blue-600 underline"
            >
              View organizer profile →
            </Link>
          </div>
        </section>
      )}

      {/* ================================
          DESCRIPTION
      ================================= */}
      <section className="rounded-3xl border border-gray-200 bg-white shadow-sm px-6 py-6 space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Event Overview</h2>
        <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
          {gig.description ?? 'No description provided.'}
        </p>
      </section>

      {/* APPLY SECTION (inside page, not fixed) */}
      <section className="rounded-3xl border border-gray-200 bg-white shadow-sm px-6 py-6 space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Ready to apply?</h2>

        {gig.status !== 'open' ? (
          <p className="text-sm text-gray-500">
            This gig is no longer accepting applications.
          </p>
        ) : (
          <button
            onClick={() => router.push(`/gigs/${gig.id}/apply`)}
            className="w-full px-6 py-3 rounded-full bg-black text-white text-sm font-medium hover:opacity-90 transition"
          >
            Apply to this gig
          </button>
        )}
      </section>
    </main>
  );
}
