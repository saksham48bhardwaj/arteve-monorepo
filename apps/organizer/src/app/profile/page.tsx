'use client';

import { useEffect, useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import { ProfileCompleteness } from '@arteve/shared/profile/completeness';
import {
  Page,
  PageHeader,
  Card,
  Input,
  Textarea,
  Button,
  Avatar,
  Modal,
  Spinner,
  Badge,
  EmptyState,
} from '@arteve/ui/components';

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
  const [savedAt, setSavedAt] = useState<Date | null>(null);

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

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersList, setFollowersList] = useState<Profile[]>([]);
  const [followingList, setFollowingList] = useState<Profile[]>([]);
  const [showFollowModal, setShowFollowModal] = useState<'followers' | 'following' | null>(null);
  const [myFollowingIds, setMyFollowingIds] = useState<string[]>([]);

  // -------- LOAD --------
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);

      const [followersRes, followingRes] = await Promise.all([
        supabase.from('followers').select('follower_id', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('followers').select('follower_id', { count: 'exact', head: true }).eq('follower_id', user.id),
      ]);
      setFollowersCount(followersRes.count || 0);
      setFollowingCount(followingRes.count || 0);

      const { data: myFollows } = await supabase.from('followers').select('following_id').eq('follower_id', user.id);
      setMyFollowingIds(myFollows?.map((f) => f.following_id) ?? []);

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

  async function refreshFollowStats() {
    if (!userId) return;
    const [followersRes, followingRes] = await Promise.all([
      supabase.from('followers').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('followers').select('follower_id', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);
    setFollowersCount(followersRes.count || 0);
    setFollowingCount(followingRes.count || 0);
    const { data: myFollows } = await supabase.from('followers').select('following_id').eq('follower_id', userId);
    setMyFollowingIds(myFollows?.map((f) => f.following_id) ?? []);
  }

  async function toggleFollowFromModal(targetId: string) {
    if (!userId || userId === targetId) return;
    const alreadyFollowing = myFollowingIds.includes(targetId);
    if (alreadyFollowing) {
      await supabase.from('followers').delete().eq('follower_id', userId).eq('following_id', targetId);
    } else {
      await supabase.from('followers').insert({ follower_id: userId, following_id: targetId });
    }
    await refreshFollowStats();
    setMyFollowingIds((prev) =>
      alreadyFollowing ? prev.filter((id) => id !== targetId) : [...prev, targetId],
    );
  }

  async function loadFollowers() {
    if (!userId) return;
    const { data } = await supabase
      .from('followers')
      .select('profiles!followers_follower_id_fkey(*)')
      .eq('following_id', userId);
    setFollowersList((data ?? []).flatMap((r) => r.profiles).filter((p): p is Profile => p !== null));
    setShowFollowModal('followers');
  }

  async function loadFollowing() {
    if (!userId) return;
    const { data } = await supabase
      .from('followers')
      .select('profiles!followers_following_id_fkey(*)')
      .eq('follower_id', userId);
    setFollowingList((data ?? []).flatMap((r) => r.profiles).filter((p): p is Profile => p !== null));
    setShowFollowModal('following');
  }

  // -------- AVATAR UPLOAD --------
  async function handleAvatarUpload(e: ChangeEvent<HTMLInputElement>) {
    if (!userId) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setErr(null);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `avatars/${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('media').upload(path, file, { upsert: true });
      if (uploadError) { setErr(uploadError.message); setUploadingAvatar(false); return; }
      const { data: publicUrl } = supabase.storage.from('media').getPublicUrl(path);
      if (publicUrl?.publicUrl) setAvatarUrl(publicUrl.publicUrl);
    } catch {
      setErr('Avatar upload failed.');
    }
    setUploadingAvatar(false);
  }

  // -------- VENUE PHOTOS UPLOAD --------
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

  // -------- SAVE --------
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
      const links = {
        instagram: instagram || undefined,
        youtube: youtube || undefined,
        website: website || undefined,
      };
      const { error } = await supabase.from('profiles').upsert(
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
      setSavedAt(new Date());
    } catch (e) {
      console.error(e);
      setErr('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Page width="default">
        <Card className="flex items-center gap-3">
          <Spinner size={16} />
          <span className="text-sm text-ink-muted">Loading your venue profile…</span>
        </Card>
      </Page>
    );
  }

  const publicProfileHref = handle ? `/profile/${handle}` : null;
  const links = [instagram, youtube, website].filter(Boolean);

  return (
    <Page width="default">
      <ProfileCompleteness
        profile={{
          display_name: venueName,
          handle,
          avatar_url: avatarUrl,
          bio,
          location,
          links: { instagram, youtube, website },
        }}
        role="organizer"
        related={{ mediaCount: venuePhotos.length }}
        editHref="/profile"
      />

      <PageHeader
        eyebrow="Organizer · Venue"
        title="Your venue profile"
        subtitle="This is what musicians see when they check your venue on Arteve. Keep it up to date so artists instantly understand your vibe."
        actions={
          publicProfileHref ? (
            <Link href={publicProfileHref} target="_blank">
              <Button variant="outline" size="sm">View public profile</Button>
            </Link>
          ) : undefined
        }
      />

      {/* ============ IDENTITY ============ */}
      <Card elevated className="!p-0 overflow-hidden">
        <div className="h-20 md:h-24 bg-[linear-gradient(120deg,var(--brand-100)_0%,var(--accent-100)_100%)]" />

        <div className="px-5 md:px-7 pb-6 -mt-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="relative">
              <div className="ring-4 ring-surface rounded-full">
                <Avatar src={avatarUrl} alt={venueName || 'Venue'} size="2xl" />
              </div>
              <label className="absolute bottom-0 right-0 inline-flex items-center justify-center h-8 w-8 rounded-full bg-brand text-white shadow cursor-pointer hover:bg-brand-600 transition">
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
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

            <div className="flex-1 min-w-0 sm:pb-2">
              <h2 className="text-xl md:text-2xl font-semibold text-ink-strong tracking-tight truncate">
                {venueName || 'Venue name'}
              </h2>
              <p className="text-sm text-ink-subtle mt-0.5">
                {handle ? `@${handle}` : 'A shareable @handle is generated when you save.'}
              </p>
              {location && (
                <p className="mt-1 text-sm text-ink-muted flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-9 8-14a8 8 0 0 0-16 0c0 5 8 14 8 14z" /><circle cx="12" cy="8" r="3" />
                  </svg>
                  {location}
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 mt-5 rounded-xl border border-line bg-surface-sunken overflow-hidden">
            <button onClick={loadFollowers} className="px-4 py-3 text-center hover:bg-surface transition border-r border-line">
              <p className="text-xl font-semibold text-ink-strong">{followersCount}</p>
              <p className="text-[11px] uppercase tracking-wider text-ink-subtle mt-0.5">Followers</p>
            </button>
            <button onClick={loadFollowing} className="px-4 py-3 text-center hover:bg-surface transition">
              <p className="text-xl font-semibold text-ink-strong">{followingCount}</p>
              <p className="text-[11px] uppercase tracking-wider text-ink-subtle mt-0.5">Following</p>
            </button>
          </div>
        </div>
      </Card>

      {/* ============ EDIT FORM ============ */}
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

      {/* ============ LINKS ============ */}
      <Card className="mt-4">
        <h2 className="section-title mb-1">Online presence</h2>
        <p className="helper mb-5">Links artists can use to vet your venue.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Instagram"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="@yourvenue"
          />
          <Input
            label="YouTube"
            value={youtube}
            onChange={(e) => setYoutube(e.target.value)}
            placeholder="Channel link"
          />
          <Input
            label="Website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
          />
        </div>

        {links.length > 0 && (
          <p className="helper mt-3">
            {links.length} link{links.length === 1 ? '' : 's'} set.
          </p>
        )}
      </Card>

      {/* ============ VENUE PHOTOS ============ */}
      <Card className="mt-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="section-title">Venue photos</h2>
            <p className="helper">Upload photos of your stage, interior, and the crowd vibe.</p>
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
          <EmptyState
            title="No venue photos yet"
            description="Add a few photos to give artists a sense of the space."
          />
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

      {/* ============ ACTIONS ============ */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={saveProfile} loading={saving} size="lg">
          Save profile
        </Button>
        {savedAt && (
          <Badge tone="success">
            Saved at {savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Badge>
        )}
        {err && <Badge tone="danger">{err}</Badge>}
      </div>

      {/* ============ FOLLOWERS / FOLLOWING MODAL ============ */}
      <Modal
        open={showFollowModal !== null}
        onClose={() => { setShowFollowModal(null); refreshFollowStats(); }}
        title={showFollowModal === 'followers' ? 'Followers' : 'Following'}
      >
        {(() => {
          const list = showFollowModal === 'followers' ? followersList : followingList;
          if (list.length === 0) {
            return <p className="text-sm text-ink-subtle">No one here yet.</p>;
          }
          return (
            <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
              {list.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-sunken">
                  <Link href={`/profile/${p.handle ?? p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar src={p.avatar_url} alt={p.display_name ?? ''} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-strong truncate">{p.display_name}</p>
                      <p className="text-xs text-ink-subtle truncate">@{p.handle}</p>
                    </div>
                  </Link>
                  {userId !== p.id && (
                    <Button
                      size="sm"
                      variant={myFollowingIds.includes(p.id) ? 'outline' : 'primary'}
                      onClick={() => toggleFollowFromModal(p.id)}
                    >
                      {myFollowingIds.includes(p.id) ? 'Unfollow' : 'Follow'}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          );
        })()}
      </Modal>
    </Page>
  );
}
