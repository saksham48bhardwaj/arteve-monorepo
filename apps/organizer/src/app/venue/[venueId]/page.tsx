'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';

type Profile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  handle: string | null;
  links: Record<string, string> | null;
  venue_photos: string[] | null;
};

export default function PublicVenueProfilePage() {
  const { venueId } = useParams<{ venueId: string }>();
  const router = useRouter();

  const [venue, setVenue] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', venueId)
        .eq('role', 'organizer')
        .maybeSingle();

      if (error || !data) {
        setVenue(null);
        setLoading(false);
        return;
      }

      setVenue(data as Profile);
      setLoading(false);
    })();
  }, [venueId]);

  if (loading) return (
    <main className="page page-narrow">
      <div className="card card-padded flex items-center gap-3"><span className="inline-block h-4 w-4 rounded-full border-2 border-brand border-r-transparent animate-spin" /><p className="text-sm text-ink-muted">Loading venue…</p></div>
    </main>
  );
  if (!venue) return <main className="p-6">Venue not found.</main>;

  const {
    display_name,
    bio,
    location,
    links = {},
    venue_photos = []
  } = venue;

  const safeLinks = links ?? {};
  const venuePhotos = venue_photos ?? [];

  const avatar = venuePhotos[0] ?? '/placeholder-venue.jpg';

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      {/* HEADER */}
      <header className="flex items-start gap-4">
        <div className="w-20 h-20 rounded-xl overflow-hidden border bg-surface-sunken border-line">
          <img
            src={avatar}
            className="w-full h-full object-cover"
            alt={display_name ?? 'Venue'}
          />
        </div>

        <div className="flex-1 space-y-1">
          <h1 className="text-2xl font-semibold">
            {display_name ?? 'Venue'}
          </h1>

          {location && (
            <p className="text-ink-muted text-sm">{location}</p>
          )}

          {/* SOCIAL LINKS */}
          <div className="flex gap-3 pt-1">
            {safeLinks.instagram && (
              <a
                href={safeLinks.instagram}
                target="_blank"
                className="text-sm text-blue-600 underline"
              >
                Instagram
              </a>
            )}
            {safeLinks.youtube && (
              <a
                href={safeLinks.youtube}
                target="_blank"
                className="text-sm text-blue-600 underline"
              >
                YouTube
              </a>
            )}
            {safeLinks.website && (
              <a
                href={safeLinks.website}
                target="_blank"
                className="text-sm text-blue-600 underline"
              >
                Website
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ABOUT */}
      {bio && (
        <section className="bg-surface border rounded-2xl p-5 shadow-sm space-y-2 border-line">
          <h2 className="text-sm font-semibold text-ink-strong">
            About this venue
          </h2>
          <p className="text-ink leading-relaxed whitespace-pre-line">
            {bio}
          </p>
        </section>
      )}

      {/* VENUE PHOTOS */}
      <section className="bg-surface border rounded-2xl p-5 shadow-sm space-y-4 border-line">
        <h2 className="text-sm font-semibold text-ink-strong">Venue Photos</h2>
        {venuePhotos.length === 0 ? (
          <p className="text-sm text-ink-subtle">No photos uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {venuePhotos.map((url) => (
              <div
                key={url}
                className="rounded-xl overflow-hidden border bg-surface-sunken aspect-video border-line"
              >
                <img
                  src={url}
                  className="w-full h-full object-cover"
                  alt="Venue"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ACTIONS */}
      <section className="flex gap-3 pt-4">
        <button
          onClick={() => router.push(`/gigs?organizer=${venueId}`)}
          className="px-4 py-2 rounded-xl bg-brand text-white text-sm"
        >
          View posted gigs
        </button>

        <button
          onClick={() => router.push(`/chat/new?user=${venue.handle}`)}
          className="px-4 py-2 rounded-xl border text-sm border-line"
        >
          Message organizer
        </button>
      </section>

    </main>
  );
}
