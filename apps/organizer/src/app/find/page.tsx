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
};

export default function FindArtistsPage() {
  const [artists, setArtists] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'musician')
        .order('display_name', { ascending: true });

      setArtists(data ?? []);
      setLoading(false);
    };

    load();
  }, []);

  const filtered = artists.filter(a =>
    a.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="p-6">Loading musicians…</div>;
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-xl font-bold">Find Artists</h1>

      <input
        type="text"
        placeholder="Search artists…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border rounded-xl px-4 py-2"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((artist) => (
          <Link
            key={artist.id}
            href={`/artist/${artist.id}`}
            className="border rounded-xl p-4 flex gap-3 hover:bg-gray-50 transition"
          >
            <img
              src={artist.avatar_url ?? '/default-avatar.png'}
              className="w-12 h-12 rounded-full object-cover"
            />

            <div className="flex-1">
              <p className="font-semibold">{artist.display_name}</p>
              {artist.bio && (
                <p className="text-sm text-gray-500 line-clamp-2">
                  {artist.bio}
                </p>
              )}
              {artist.location && (
                <p className="text-xs text-gray-400 mt-1">
                  {artist.location}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
