'use client';

import { useEffect, useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  bio: string | null;
  location: string | null;
  links: Record<string, string> | null;
  venue_photos: string[] | null;
};

export default function VenueProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // form fields
  const [venueName, setVenueName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [website, setWebsite] = useState('');
  const [venuePhotos, setVenuePhotos] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }

      const p = data as Profile | null;
      if (p) {
        setVenueName(p.display_name ?? '');
        setBio(p.bio ?? '');
        setLocation(p.location ?? '');
        const links = p.links ?? {};
        setInstagram(links.instagram ?? '');
        setYoutube(links.youtube ?? '');
        setWebsite(links.website ?? '');
        setVenuePhotos(p.venue_photos ?? []);
      }

      setLoading(false);
    })();
  }, [router]);

  async function handleVenuePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    if (!userId) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    setErr(null);

    const newUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `venue-photos/${userId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;

        const { error: uploadError } = await supabase
          .storage
          .from('media') // ⬅ change bucket name here if needed
          .upload(path, file);

        if (uploadError) {
          setErr(uploadError.message);
          continue;
        }

        const { data: publicData } = supabase
          .storage
          .from('media')
          .getPublicUrl(path);

        if (publicData?.publicUrl) {
          newUrls.push(publicData.publicUrl);
        }
      }

      if (newUrls.length) {
        setVenuePhotos(prev => [...prev, ...newUrls]);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to upload photos');
    } finally {
      setUploadingPhotos(false);
      // reset input so same file can be selected again if needed
      e.target.value = '';
    }
  }

  async function saveProfile() {
    if (!userId) return;
    setSaving(true);
    setErr(null);

    try {
      const links = {
        instagram: instagram || undefined,
        youtube: youtube || undefined,
        website: website || undefined,
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: userId,
            display_name: venueName || null,
            role: 'organizer',              // 🔒 fixed role for this app
            bio: bio || null,
            location: location || null,
            links,
            venue_photos: venuePhotos.length ? venuePhotos : null,
          },
          { onConflict: 'id' }
        );

      if (error) throw error;
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) return <main className="p-6">Loading venue profile…</main>;

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Venue profile</h1>
        <p className="text-sm text-gray-600">
          This is what musicians will see when they view Atomic Rooster on Arteve.
        </p>
      </header>

      <section className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Venue name</span>
          <input
            className="w-full border rounded-xl p-2 mt-1"
            value={venueName}
            onChange={e => setVenueName(e.target.value)}
            placeholder="Atomic Rooster"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">About this venue</span>
          <textarea
            className="w-full border rounded-xl p-2 mt-1"
            rows={4}
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Cozy Bank Street bar with weekly live music and monthly art shows."
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Location</span>
          <input
            className="w-full border rounded-xl p-2 mt-1"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="303 Bank St, Ottawa, ON"
          />
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Online presence</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block text-sm">
            Instagram
            <input
              className="w-full border rounded-xl p-2 mt-1"
              value={instagram}
              onChange={e => setInstagram(e.target.value)}
              placeholder="@atomicrooster"
            />
          </label>
          <label className="block text-sm">
            YouTube
            <input
              className="w-full border rounded-xl p-2 mt-1"
              value={youtube}
              onChange={e => setYoutube(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Website
            <input
              className="w-full border rounded-xl p-2 mt-1"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://www.atomicrooster.ca"
            />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Venue photos</h2>
        <p className="text-xs text-gray-500">
          Add a few photos of your stage, bar, or crowd so musicians know what the space looks like.
        </p>

        <label className="inline-flex items-center gap-2 text-sm">
          <span className="px-3 py-2 border rounded-xl cursor-pointer">
            {uploadingPhotos ? 'Uploading…' : 'Upload photos'}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleVenuePhotoUpload}
          />
        </label>

        {venuePhotos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
            {venuePhotos.map((url) => (
              <div
                key={url}
                className="relative overflow-hidden rounded-xl border aspect-video bg-gray-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt="Venue photo"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex gap-3">
        <button
          onClick={saveProfile}
          disabled={saving}
          className="px-4 py-2 rounded-xl border text-sm"
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        <button
          onClick={signOut}
          className="px-4 py-2 rounded-xl border text-sm"
        >
          Sign out
        </button>
      </section>

      {err && <p className="text-sm text-red-600">{err}</p>}
    </main>
  );
}
