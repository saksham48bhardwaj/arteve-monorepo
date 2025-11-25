'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  genres: string[] | null;
  links: Record<string, string> | null;
};

export default function MusicianProfilePage({ params }: { params: { id: string } }) {
  const artistId = params.id;
  const [artist, setArtist] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', artistId)
        .single();

      setArtist(data);
      setLoading(false);
    };

    load();
  }, [artistId]);

  if (loading) return <div className="p-6">Loading profile…</div>;
  if (!artist) return <div className="p-6">Artist not found.</div>;

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <div className="flex gap-4 items-center">
        <img
          src={artist.avatar_url ?? '/default-avatar.png'}
          className="w-24 h-24 rounded-full object-cover"
        />
        <div>
          <h2 className="text-xl font-semibold">{artist.display_name}</h2>
          <p className="text-gray-500">{artist.location}</p>
        </div>
      </div>

      {artist.bio && (
        <p className="text-gray-700">{artist.bio}</p>
      )}

      <div>
        <h3 className="font-medium mb-2">Genres</h3>
        {artist.genres?.length ? (
          <div className="flex flex-wrap gap-2">
            {artist.genres.map((g, i) => (
              <span key={i} className="px-3 py-1 text-sm bg-gray-100 rounded-full">
                {g}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No genres listed</p>
        )}
      </div>

      <Link
        href={`/book/${artist.id}`}
        className="block text-center px-4 py-2 bg-blue-600 text-white rounded-xl"
      >
        Book Musician
      </Link>

    </main>
  );
}
