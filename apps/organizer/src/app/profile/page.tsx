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

export default function OrganizerProfilePage() {
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

  // -------------------------
  // LOAD PROFILE
  // -------------------------
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

      if (data) {
        const p = data as Profile;

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

  // -------------------------
  // UPLOAD PHOTOS
  // -------------------------
  async function handleVenuePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    if (!userId) return;
    const files = e.target.files;
    if (!files) return;

    setUploadingPhotos(true);
    setErr(null);

    const uploaded: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `venue-photos/${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase
          .storage
          .from('media')
          .upload(path, file);

        if (uploadError) {
          setErr(uploadError.message);
          continue;
        }

        const { data: publicUrl } = supabase
          .storage
          .from('media')
          .getPublicUrl(path);

        if (publicUrl?.publicUrl) uploaded.push(publicUrl.publicUrl);
      }

      if (uploaded.length) {
        setVenuePhotos(prev => [...prev, ...uploaded]);
      }
    } catch (e) {
      setErr('Photo upload failed.');
    }

    setUploadingPhotos(false);
    e.target.value = '';
  }

  // -------------------------
  // SAVE PROFILE
  // -------------------------
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
            role: 'organizer',
            bio: bio || null,
            location: location || null,
            links,
            venue_photos: venuePhotos.length ? venuePhotos : null,
          },
          { onConflict: 'id' }
        );

      if (error) throw error;
    } catch {
      setErr('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) return <main className="p-6">Loading profile…</main>;

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-8">

      {/* HEADER */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Organizer Profile</h1>
        <p className="text-sm text-gray-600">
          This is what musicians will see when viewing your venue on Arteve.
        </p>
      </header>

      {/* PROFILE CARD */}
      <div className="bg-white border rounded-2xl p-6 space-y-6 shadow-sm">

        {/* Venue name */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Venue name</label>
          <input
            className="w-full border rounded-xl px-3 py-2 text-sm"
            value={venueName}
            onChange={e => setVenueName(e.target.value)}
            placeholder="Atomic Rooster"
          />
        </div>

        {/* About */}
        <div className="space-y-1">
          <label className="text-sm font-medium">About this venue</label>
          <textarea
            className="w-full border rounded-xl px-3 py-2 text-sm min-h-[120px]"
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Cozy Bank Street bar with weekly live music and monthly art shows."
          />
        </div>

        {/* Location */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Location</label>
          <input
            className="w-full border rounded-xl px-3 py-2 text-sm"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="303 Bank St, Ottawa, ON"
          />
        </div>

      </div>

      {/* SOCIAL LINKS */}
      <div className="bg-white border rounded-2xl p-6 space-y-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-800">Online presence</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Instagram</label>
            <input
              className="w-full border rounded-xl px-3 py-2 text-sm"
              value={instagram}
              onChange={e => setInstagram(e.target.value)}
              placeholder="@atomicrooster"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">YouTube</label>
            <input
              className="w-full border rounded-xl px-3 py-2 text-sm"
              value={youtube}
              onChange={e => setYoutube(e.target.value)}
              placeholder="Channel URL"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Website</label>
            <input
              className="w-full border rounded-xl px-3 py-2 text-sm"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
        </div>
      </div>

      {/* PHOTOS */}
      <div className="bg-white border rounded-2xl p-6 space-y-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-800">Venue photos</h2>
        <p className="text-xs text-gray-500">
          Add photos of your stage, interior, or crowd so musicians understand your setup.
        </p>

        {/* Upload button */}
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <span className="px-4 py-2 text-sm border rounded-xl bg-gray-50 hover:bg-gray-100">
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

        {/* Gallery */}
        {venuePhotos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {venuePhotos.map((url) => (
              <div
                key={url}
                className="relative overflow-hidden rounded-xl border aspect-video bg-gray-100"
              >
                <img src={url} className="w-full h-full object-cover" alt="" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={saveProfile}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>

        <button
          onClick={signOut}
          className="px-5 py-2.5 rounded-xl border text-sm"
        >
          Sign out
        </button>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
    </main>
  );
}
