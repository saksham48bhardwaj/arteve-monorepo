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
  handle: string | null;
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
  const [handle, setHandle] = useState('');

  // -------------------------
  // LOAD PROFILE
  // -------------------------
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

      const { data: publicUrl } = supabase.storage.from('media').getPublicUrl(path);

      if (publicUrl?.publicUrl) {
        setAvatarUrl(publicUrl.publicUrl);
      }
    } catch {
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

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(path, file);

        if (uploadError) {
          setErr(uploadError.message);
          continue;
        }

        const { data: publicUrl } = supabase.storage.from('media').getPublicUrl(path);

        if (publicUrl?.publicUrl) uploaded.push(publicUrl.publicUrl);
      }

      if (uploaded.length) {
        setVenuePhotos(prev => [...prev, ...uploaded]);
      }
    } catch {
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
      let finalHandle = handle?.trim() || '';

      if (!finalHandle) {
        const base =
          (venueName || 'venue')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 30) || 'venue';

        let candidate = base;
        let counter = 1;

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
          { onConflict: 'id' },
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
      <main className="mx-auto max-w-3xl px-4 pt-10 pb-20">
        <div className="animate-pulse text-sm text-slate-500">Loading profile…</div>
      </main>
    );
  }

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      {/* PAGE HEADER */}
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[#4E7FA2]">
          Organizer · Venue
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Your Venue Profile
        </h1>
        <p className="text-slate-500 max-w-xl">
          This is what musicians see when they check your venue on Arteve. Keep it
          up to date so artists instantly understand your vibe.
        </p>
      </header>

      {/* PROFILE INFO CARD */}
      <section className="relative rounded-3xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.06)] p-6 sm:p-7 space-y-6">
        {/* Subtle gradient accent strip */}
        <div className="pointer-events-none absolute inset-x-0 -top-px h-1 rounded-t-3xl" />

        {/* Avatar + Name */}
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20">
            <img
              src={avatarUrl || '/icons/default-avatar.png'}
              className="w-20 h-20 rounded-full object-cover border border-slate-200"
              alt="Venue avatar"
            />
            <label className="absolute bottom-0 right-0 bg-white border border-slate-200 rounded-full px-2 py-1 text-[11px] cursor-pointer shadow-sm">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              {uploadingAvatar ? '…' : 'Edit'}
            </label>
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 truncate">
              {venueName || 'Venue name'}
            </h2>
            <p className="text-sm text-slate-400 truncate">
              {handle ? `@${handle}` : 'A shareable handle will be generated when you save.'}
            </p>
          </div>
        </div>

        {/* Venue Name */}
        <div className="space-y-1.5">
          <label className="font-medium text-slate-800">Venue name</label>
          <input
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#4E7FA2] focus:bg-white focus:ring-1 focus:ring-[#4E7FA2]/40"
            value={venueName}
            onChange={e => setVenueName(e.target.value)}
            placeholder="Atomic Rooster"
          />
        </div>

        {/* About */}
        <div className="space-y-1.5">
          <label className="font-medium text-slate-800">About this venue</label>
          <textarea
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 min-h-[120px] outline-none focus:border-[#4E7FA2] focus:bg-white focus:ring-1 focus:ring-[#4E7FA2]/40"
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell musicians about your stage, setup, crowd, ambience, capacity, genres you prefer, etc."
          />
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <label className="font-medium text-slate-800">Location</label>
          <input
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#4E7FA2] focus:bg-white focus:ring-1 focus:ring-[#4E7FA2]/40"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="303 Bank Street, Ottawa, ON"
          />
        </div>
      </section>

      {/* SOCIAL LINKS */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.04)] p-6 sm:p-7 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Online presence</h2>
            <p className="text-sm text-slate-500 mt-1">
              Add links so artists can quickly explore your venue online.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="te  xt-sm font-medium text-slate-800">Instagram</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#4E7FA2] focus:bg-white focus:ring-1 focus:ring-[#4E7FA2]/40"
              value={instagram}
              onChange={e => setInstagram(e.target.value)}
              placeholder="@yourvenue"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-slate-800">YouTube</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#4E7FA2] focus:bg-white focus:ring-1 focus:ring-[#4E7FA2]/40"
              value={youtube}
              onChange={e => setYoutube(e.target.value)}
              placeholder="Channel link"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-slate-800">Website</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#4E7FA2] focus:bg-white focus:ring-1 focus:ring-[#4E7FA2]/40"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
        </div>
      </section>

      {/* VENUE PHOTOS */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.04)] p-6 sm:p-7 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Venue photos</h2>
            <p className="text-slate-500 mt-1">
              Upload photos of your stage, interior, and the crowd vibe.
            </p>
          </div>
        </div>

        <label className="inline-flex items-center gap-2 cursor-pointer">
          <span className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100">
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

        {venuePhotos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {venuePhotos.map(url => (
              <div
                key={url}
                className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 aspect-video"
              >
                <img src={url} className="w-full h-full object-cover" alt="Venue photo" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">No photos added yet.</p>
        )}
      </section>

      {/* ACTION BUTTONS */}
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          onClick={saveProfile}
          disabled={saving}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#4E7FA2] text-white font-medium shadow-sm hover:bg-[#406985] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>

        <button
          onClick={signOut}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>

      {err && <p className="text-red-600">{err}</p>}
    </main>
  );
}
