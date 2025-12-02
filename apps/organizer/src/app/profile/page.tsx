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
  handle: string | null; // NEW
};

export default function OrganizerProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // form fields
  const [venueName, setVenueName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [website, setWebsite] = useState('');
  const [venuePhotos, setVenuePhotos] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [handle, setHandle] = useState(''); // NEW

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
        setAvatarUrl(p.avatar_url ?? '');
        setHandle(p.handle ?? '');

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
  // UPLOAD AVATAR
  // -------------------------
  async function handleAvatarUpload(e: ChangeEvent<HTMLInputElement>) {
    if (!userId) return;

    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setErr(null);

    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `avatars/${userId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(path, file, { upsert: true });

      if (uploadError) {
        setErr(uploadError.message);
        setUploadingAvatar(false);
        return;
      }

      const { data: publicUrl } = supabase.storage
        .from('media')
        .getPublicUrl(path);

      if (publicUrl?.publicUrl) {
        setAvatarUrl(publicUrl.publicUrl);
      }
    } catch (e) {
      setErr('Avatar upload failed.');
    }

    setUploadingAvatar(false);
  }

  // -------------------------
  // UPLOAD VENUE PHOTOS
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
  // SAVE PROFILE (with handle generation)
  // -------------------------
  async function saveProfile() {
    if (!userId) return;

    setSaving(true);
    setErr(null);

    try {
      // ----- Ensure we have a unique handle -----
      let finalHandle = handle?.trim() || '';

      if (!finalHandle) {
        // Generate base from venue name
        const base = (venueName || 'venue')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-') // non-alphanum -> dash
          .replace(/^-+|-+$/g, '')     // trim dashes
          .substring(0, 30) || 'venue';

        let candidate = base;
        let counter = 1;

        // Loop until we find a free handle
        // (profiles.handle has a unique index)
        while (true) {
          const { data: conflict } = await supabase
            .from('profiles')
            .select('id')
            .eq('handle', candidate)
            .maybeSingle();

          if (!conflict) break;

          candidate = `${base}-${counter}`;
          counter += 1;
        }

        finalHandle = candidate;
        setHandle(finalHandle);
      }

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
            avatar_url: avatarUrl || null,
            links,
            venue_photos: venuePhotos.length ? venuePhotos : null,
            handle: finalHandle,
          },
          { onConflict: 'id' }
        );

      if (error) throw error;
    } catch (e) {
      console.error(e);
      setErr('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <main className="p-6">
        <div className="animate-pulse text-sm text-gray-500">
          Loading profile…
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-10">

      {/* PAGE HEADER */}
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Your Venue Profile</h1>
        <p className="text-sm text-gray-500">
          This is what musicians see when they check your venue on Arteve.
        </p>
      </header>

      {/* PROFILE INFO CARD */}
      <section className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-sm p-6 space-y-6">

        {/* Avatar + Name */}
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20">
            <img
              src={avatarUrl || "/icons/default-avatar.png"}
              className="w-20 h-20 rounded-full object-cover border dark:border-neutral-700"
              alt="Venue avatar"
            />
            <label className="absolute bottom-0 right-0 bg-white dark:bg-neutral-800 border rounded-full p-1 text-xs cursor-pointer shadow-sm dark:border-neutral-700">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              {uploadingAvatar ? "…" : "✎"}
            </label>
          </div>

          <div>
            <h2 className="font-medium text-lg">{venueName || "Venue Name"}</h2>
            <p className="text-xs text-gray-400 mt-1">
              {handle
                ? `@${handle}`
                : 'A shareable handle will be generated when you save.'}
            </p>
          </div>
        </div>

        {/* Venue Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Venue name</label>
          <input
            className="w-full border rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-900 dark:border-neutral-700"
            value={venueName}
            onChange={e => setVenueName(e.target.value)}
            placeholder="Atomic Rooster"
          />
        </div>

        {/* About */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">About this venue</label>
          <textarea
            className="w-full border rounded-xl px-3 py-2 text-sm min-h-[140px] bg-white dark:bg-neutral-900 dark:border-neutral-700"
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell musicians about your stage, setup, crowd, ambience, capacity, etc."
          />
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Location</label>
          <input
            className="w-full border rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-900 dark:border-neutral-700"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="303 Bank St, Ottawa, ON"
          />
        </div>

      </section>

      {/* SOCIAL LINKS */}
      <section className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-sm p-6 space-y-5">
        <h2 className="text-base font-semibold">Online presence</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* IG */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Instagram</label>
            <input
              className="w-full border rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-900 dark:border-neutral-700"
              value={instagram}
              onChange={e => setInstagram(e.target.value)}
              placeholder="@atomicrooster"
            />
          </div>

          {/* YouTube */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">YouTube</label>
            <input
              className="w-full border rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-900 dark:border-neutral-700"
              value={youtube}
              onChange={e => setYoutube(e.target.value)}
              placeholder="Channel link"
            />
          </div>

          {/* Website */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Website</label>
            <input
              className="w-full border rounded-xl px-3 py-2 text-sm bg-white dark:bg-neutral-900 dark:border-neutral-700"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
        </div>
      </section>

      {/* VENUE PHOTOS */}
      <section className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Venue photos</h2>
        </div>

        <p className="text-xs text-gray-500">
          Upload photos of your stage, interior, and the crowd vibe.
        </p>

        {/* Upload */}
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <span className="px-4 py-2 text-sm border rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-neutral-800 dark:border-neutral-700">
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
        {venuePhotos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {venuePhotos.map(url => (
              <div
                key={url}
                className="relative overflow-hidden rounded-xl border aspect-video bg-gray-100 dark:border-neutral-700"
              >
                <img
                  src={url}
                  className="w-full h-full object-cover"
                  alt="Venue photo"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">No photos added yet.</p>
        )}
      </section>

      {/* ACTION BUTTONS */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={saveProfile}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>

        <button
          onClick={signOut}
          className="px-5 py-2.5 rounded-xl border text-sm font-medium dark:border-neutral-700"
        >
          Sign out
        </button>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
    </main>
  );
}
