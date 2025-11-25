'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';

type GigStatus = 'open' | 'closed' | string;

type Gig = {
  id: string;
  organizer_id: string;
  title: string | null;
  description: string | null;
  event_date: string | null;
  location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  genres: string[] | null;
  status: GigStatus;
};

export default function MusicianGigsListPage() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('gigs')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setGigs(data as Gig[]);
      }
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return <main className="p-6">Loading gigs…</main>;
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-xl font-semibold">Available Gigs</h1>

      {gigs.length === 0 && (
        <p className="text-sm text-gray-500">
          No open gigs right now. Check back later!
        </p>
      )}

      <div className="space-y-3">
        {gigs.map((gig) => (
          <Link
            key={gig.id}
            href={`/gigs/${gig.id}`}
            className="block border rounded-xl p-4 hover:bg-gray-50 transition"
          >
            <div className="flex justify-between gap-4">
              <div>
                <p className="font-medium">{gig.title ?? 'Untitled gig'}</p>
                {gig.location && (
                  <p className="text-sm text-gray-500">{gig.location}</p>
                )}
                {gig.event_date && (
                  <p className="text-sm text-gray-500">
                    {new Date(gig.event_date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                )}
                {gig.genres && gig.genres.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    Genres: {gig.genres.join(', ')}
                  </p>
                )}
              </div>

              {(gig.budget_min !== null || gig.budget_max !== null) && (
                <div className="text-right text-sm text-gray-600">
                  <span className="font-medium">Budget</span>
                  <div>
                    {gig.budget_min !== null ? `$${gig.budget_min}` : 'TBD'}
                    {gig.budget_max !== null ? ` – $${gig.budget_max}` : ''}
                  </div>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
