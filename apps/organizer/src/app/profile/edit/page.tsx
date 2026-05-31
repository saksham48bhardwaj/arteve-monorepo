'use client';

import { useEffect, useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import {
  Page,
  PageHeader,
  Card,
  Input,
  Textarea,
  Button,
  Avatar,
  Spinner,
  Badge,
  EmptyState,
  AvatarCropper,
  toast,
} from '@arteve/ui/components';

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  bio: string | null;
  quote: string | null;
  location: string | null;
  links: Record<string, string> | null;
  venue_photos: string[] | null;
  handle: string | null;
};

export default function OrganizerProfileEditPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const [venueName, setVenueName] = useState('');
  const [bio, setBio] = useState('');
  const [quote, setQuote] = useState('');
  const [location, setLocation] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [website, setWebsite] = useState('');
  const [venuePhotos, setVenuePhotos] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [handle, setHandle] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);

      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }
      if (data) {
        const p = data as Profile;
        setVenueName(p.display_name ?? '');
        setBio(p.bio ?? '');
        setQuote(p.quote ?? '');
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

  function handleAvatarPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!userId) {
      toast.error('User not loaded yet');
      return;
    }
    e.target.value = '';
    setPendingAvatarFile(file);
  }

  async function uploadCroppedAvatar(blob: Blob) {
    if (!userId) return;
    setUploadingAvatar(true);
    setErr(null);
    try {
      const path = `avatars/${userId}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) {
        setErr(uploadError.message);
        toast.error(uploadError.message);
        return;
      }
      const { data: publicUrl } = supabase.storage.from('media').getPublicUrl(path);
      if (publicUrl?.publicUrl) setAvatarUrl(publicUrl.publicUrl);
      setPendingAvatarFile(null);
    } catch {
      setErr('Avatar upload failed.');
      toast.error('Avatar upload failed.');
    } finally {
      setUploadingAvatar(false);
    }
  }

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
        const { error: uploadError } = await supabase.storage.from('media').upload(path, file);
        if (uploadError) { setErr(uploadError.message); continue; }
        const { data: publicUrl } = supabase.storage.from('media').getPublicUrl(path);
        if (publicUrl?.publicUrl) uploaded.push(publicUrl.publicUrl);
      }
      if (uploaded.length) setVenuePhotos((prev) => [...prev, ...uploaded]);
    } catch {
      setErr('Photo upload failed.');
    }
    setUploadingPhotos(false);
    e.target.value = '';
  }

  function removeVenuePhoto(url: string) {
    setVenuePhotos((prev) => prev.filter((p) => p !== url));
  }

  async function saveProfile() {
    if (!userId) return;
    setSaving(true);
    setErr(null);
    try {
      let finalHandle = handle?.trim() || '';
      if (!finalHandle) {
        const base =
          (venueName || 'venue').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 30) || 'venue';
        let candidate = base;
        let counter = 1;
        while (true) {
          const { data: conflict } = await supabase.from('profiles').select('id').eq('handle', candidate).maybeSingle();
          if (!conflict) break;
          candidate = `${base}-${counter}`;
          counter += 1;
        }
        finalHandle = candidate;
        setHandle(finalHandle);
      }
      // Sanitize links: block javascript:/data: schemes, normalize bare
      // handles/domains into full https URLs.
      const blocked = (s: string) => /^\s*(javascript|data|vbscript):/i.test(s);
      const toUrl = (v: string, base?: string): string | undefined => {
        const s = v.trim();
        if (!s || blocked(s)) return undefined;
        if (/^https?:\/\//i.test(s)) return s;
        if (base) return `${base}/${s.replace(/^@/, '').replace(/^\/+/, '')}`;
        return `https://${s.replace(/^\/+/, '')}`;
      };
      const links = {
        instagram: toUrl(instagram, 'https://instagram.com'),
        youtube: toUrl(youtube, 'https://youtube.com'),
        website: toUrl(website),
      };
      const { error } = await supabase.from('profiles').upsert(
        {
          id: userId,
          display_name: venueName || null,
          role: 'organizer',
          bio: bio || null,
          quote: quote || null,
          location: location || null,
          avatar_url: avatarUrl || null,
          links,
          venue_photos: venuePhotos.length ? venuePhotos : null,
          handle: finalHandle,
        },
        { onConflict: 'id' },
      );
      if (error) throw error;
      setSavedAt(new Date());
    } catch (e) {
      console.error(e);
      setErr(e instanceof Error ? e.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Page width="default">
        <Card className="flex items-center gap-3">
          <Spinner size={16} />
          <span className="text-sm text-ink-muted">Loading…</span>
        </Card>
      </Page>
    );
  }

  return (
    <Page width="default">
      <PageHeader
        eyebrow="Organizer · Edit"
        title="Edit venue profile"
        subtitle="Update what musicians see when they browse your venue."
        actions={
          <Link href="/profile">
            <Button variant="ghost" size="sm">Cancel</Button>
          </Link>
        }
      />

      {/* Avatar */}
      <Card className="mt-2">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar src={avatarUrl} alt={venueName || 'Venue'} size="xl" />
            <label className="absolute -bottom-1 -right-1 inline-flex items-center justify-center h-8 w-8 rounded-full bg-brand text-white shadow cursor-pointer hover:bg-brand-600 transition">
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
              {uploadingAvatar ? (
                <Spinner size={14} />
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Change avatar">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              )}
            </label>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-strong truncate">{venueName || 'Venue name'}</p>
            <p className="text-xs text-ink-subtle truncate">{handle ? `@${handle}` : 'Handle generated on save'}</p>
          </div>
        </div>
      </Card>

      {/* Form */}
      <Card className="mt-4">
        <h2 className="section-title mb-1">Venue details</h2>
        <p className="helper mb-5">Tell artists what makes your space worth a booking.</p>
        <div className="space-y-4">
          <Input
            label="Venue name"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder="The Blue Stage"
          />
          <Input
            label="Tagline"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            placeholder="A one-liner that captures your venue's vibe"
            helper="Shown as a banner on your public profile."
          />
          <Textarea
            label="About this venue"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell musicians about your stage, setup, crowd, ambience, capacity, genres you prefer, etc."
            rows={5}
          />
          <Input
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="303 Bank Street, Ottawa, ON"
          />
          <Input
            label="@ handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="auto-generated if left blank"
            helper="Lowercase letters, numbers, and dashes."
            leadingIcon={<span className="font-medium">@</span>}
          />
        </div>
      </Card>

      {/* Links */}
      <Card className="mt-4">
        <h2 className="section-title mb-1">Online presence</h2>
        <p className="helper mb-5">Links artists can use to vet your venue.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@yourvenue" />
          <Input label="YouTube" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="Channel link" />
          <Input label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" />
        </div>
      </Card>

      {/* Venue photos */}
      <Card className="mt-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="section-title">Venue photos</h2>
            <p className="helper">Stage, interior, the crowd vibe.</p>
          </div>
          <label>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleVenuePhotoUpload} />
            <Button
              variant="primary"
              size="sm"
              loading={uploadingPhotos}
              type="button"
              onClick={(e) => (e.currentTarget.previousElementSibling as HTMLInputElement)?.click()}
            >
              Upload
            </Button>
          </label>
        </div>

        {venuePhotos.length === 0 ? (
          <EmptyState title="No venue photos yet" description="Add a few photos to give artists a sense of the space." />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {venuePhotos.map((url) => (
              <div key={url} className="group relative overflow-hidden rounded-xl border border-line bg-surface-sunken aspect-video">
                <img src={url} className="w-full h-full object-cover" alt="Venue" />
                <button
                  type="button"
                  onClick={() => removeVenuePhoto(url)}
                  aria-label="Remove photo"
                  className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink-strong/80 text-white opacity-0 group-hover:opacity-100 transition"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={saveProfile} loading={saving} size="lg">
          Save profile
        </Button>
        <Link href="/profile">
          <Button variant="outline" size="lg">Back to profile</Button>
        </Link>
        {savedAt && (
          <Badge tone="success">
            Saved at {savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Badge>
        )}
        {err && <Badge tone="danger">{err}</Badge>}
      </div>

      <AvatarCropper
        file={pendingAvatarFile}
        onCancel={() => setPendingAvatarFile(null)}
        onCropped={uploadCroppedAvatar}
      />
    </Page>
  );
}
