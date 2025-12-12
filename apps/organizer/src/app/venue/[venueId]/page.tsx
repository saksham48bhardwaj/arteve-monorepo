'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';

type Profile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
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

  if (loading) return <main className="p-6">Loading venue…</main>;
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
        <div className="w-20 h-20 rounded-xl overflow-hidden border bg-gray-100">
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
            <p className="text-gray-600 text-sm">{location}</p>
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
        <section className="bg-white border rounded-2xl p-5 shadow-sm space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">
            About this venue
          </h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {bio}
          </p>
        </section>
      )}

      {/* VENUE PHOTOS */}
      <section className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-800">Venue Photos</h2>
        {venuePhotos.length === 0 ? (
          <p className="text-sm text-gray-500">No photos uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {venuePhotos.map((url) => (
              <div
                key={url}
                className="rounded-xl overflow-hidden border bg-gray-100 aspect-video"
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
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm"
        >
          View posted gigs
        </button>

        <button
          onClick={() => router.push(`/messages/create?to=${venueId}`)}
          className="px-4 py-2 rounded-xl border text-sm"
        >
          Message organizer
        </button>
      </section>

    </main>
  );
}
