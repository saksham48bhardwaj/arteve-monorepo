'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@arteve/supabase/client';

type VenueProfile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  links: Record<string, string> | null;
  venue_photos: string[] | null;
};

export default function PublicVenuePage() {
  const { handle } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<VenueProfile | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('handle', handle)
        .eq('role', 'organizer')
        .maybeSingle();

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setProfile(data as VenueProfile);
      setLoading(false);
    }

    loadProfile();
  }, [handle]);

  if (loading) {
    return (
      <main className="p-6 text-center text-gray-500">
        Loading venue…
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="p-6 text-center text-gray-500">
        Venue not found.
      </main>
    );
  }

  const links = profile.links ?? {};

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      {/* HEADER */}
      <header className="flex items-center gap-5">
        <img
          src={profile.avatar_url || '/default-avatar.png'}
          alt="Venue"
          className="w-20 h-20 rounded-2xl object-cover border"
        />

        <div>
          <h1 className="text-3xl font-bold leading-tight">
            {profile.display_name}
          </h1>

          {profile.handle && (
            <p className="text-sm text-gray-500">@{profile.handle}</p>
          )}

          {profile.location && (
            <p className="text-sm text-gray-600 mt-1">{profile.location}</p>
          )}
        </div>
      </header>

      {/* BIO */}
      {profile.bio && (
        <section className="bg-white border rounded-2xl p-6 shadow-sm space-y-2">
          <h2 className="text-lg font-semibold">About</h2>
          <p className="text-gray-700 whitespace-pre-line">
            {profile.bio}
          </p>
        </section>
      )}

      {/* PHOTOS */}
      {profile.venue_photos && profile.venue_photos.length > 0 && (
        <section className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Venue Photos</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {profile.venue_photos.map((url) => (
              <div
                key={url}
                className="aspect-video rounded-xl overflow-hidden border bg-gray-100"
              >
                <img
                  src={url}
                  alt="Venue"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* LINKS */}
      {(links.instagram || links.youtube || links.website) && (
        <section className="bg-white border rounded-2xl p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold">Online Presence</h2>

          <ul className="space-y-2 text-sm">
            {links.instagram && (
              <li>
                <a
                  href={links.instagram}
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  Instagram →
                </a>
              </li>
            )}
            {links.youtube && (
              <li>
                <a
                  href={links.youtube}
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  YouTube →
                </a>
              </li>
            )}
            {links.website && (
              <li>
                <a
                  href={links.website}
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  Website →
                </a>
              </li>
            )}
          </ul>
        </section>
      )}

      {/* BACK BUTTON */}
      <button
        onClick={() => router.back()}
        className="px-4 py-2 rounded-xl border text-sm hover:bg-gray-100 transition"
      >
        ← Back
      </button>
    </main>
  );
}
