'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import { RatingDisplay, ReviewList } from '@arteve/shared/reviews';
import { AudioPlayer } from '@arteve/shared/media/AudioPlayer';
import {
  Card,
  Button,
  Avatar,
  Badge,
  EmptyState,
  Tabs,
  Modal,
  Spinner,
} from '@arteve/ui/components';

type Achievement = { id: string; title: string | null; description: string | null; year: number | null };
type Show = { id: string; title: string | null; venue: string | null; location: string | null; event_date: string | null };
type Skill = { id: string; skill: string | null; level: string | null };
type Recommendation = { id: string; author: string | null; content: string | null };
type Profile = {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  bio: string | null;
  genres: string[] | null;
  links: Record<string, string> | null;
  location: string | null;
  quote: string | null;
};
type PostMedia = {
  id: string;
  media_url: string;
  media_type: 'image' | 'video' | 'audio';
  caption: string | null;
  kind: 'post' | 'bit';
  created_at: string;
};
type FollowerRow = { follower_id: string; profiles: Profile | null };
type FollowingRow = { following_id: string; profiles: Profile | null };

function extractStoragePath(publicUrl: string): string | null {
  const marker = '/storage/v1/object/public/media/';
  const i = publicUrl.indexOf(marker);
  return i === -1 ? null : publicUrl.substring(i + marker.length);
}

function abbreviateCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}K`;
  return `${(n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0).replace(/\.0$/, '')}M`;
}

/** Brand color for a given social platform key */
function socialColor(key: string): string {
  const k = key.toLowerCase();
  if (k.includes('instagram')) return '#E1306C';
  if (k.includes('facebook')) return '#1877F2';
  if (k.includes('twitter') || k === 'x') return '#0F1419';
  if (k.includes('youtube')) return '#FF0000';
  if (k.includes('spotify')) return '#1DB954';
  if (k.includes('soundcloud')) return '#FF5500';
  if (k.includes('apple')) return '#000000';
  if (k.includes('linkedin')) return '#0A66C2';
  if (k.includes('tiktok')) return '#010101';
  if (k.includes('website') || k.includes('site')) return '#4E7FA2';
  return '#4E7FA2';
}

function SocialIcon({ name }: { name: string }) {
  const k = name.toLowerCase();
  const common = { className: 'h-5 w-5', viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true } as const;
  if (k.includes('instagram')) {
    return (
      <svg {...common}>
        <path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.37 1.06.42 2.23.06 1.25.07 1.62.07 4.8s0 3.6-.07 4.85c-.05 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.17-1.06.37-2.23.42-1.25.06-1.62.07-4.85.07s-3.6 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.42-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.17-.42-.37-1.06-.42-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.37 2.23-.42C8.4 2.2 8.8 2.2 12 2.2zm0 1.6c-3.15 0-3.5 0-4.74.07-1.08.05-1.66.23-2.05.38-.51.2-.88.44-1.27.83-.39.39-.63.76-.83 1.27-.15.39-.33.97-.38 2.05C2.66 8.5 2.66 8.85 2.66 12s0 3.5.07 4.74c.05 1.08.23 1.66.38 2.05.2.51.44.88.83 1.27.39.39.76.63 1.27.83.39.15.97.33 2.05.38 1.24.07 1.59.07 4.74.07s3.5 0 4.74-.07c1.08-.05 1.66-.23 2.05-.38.51-.2.88-.44 1.27-.83.39-.39.63-.76.83-1.27.15-.39.33-.97.38-2.05.07-1.24.07-1.59.07-4.74s0-3.5-.07-4.74c-.05-1.08-.23-1.66-.38-2.05-.2-.51-.44-.88-.83-1.27-.39-.39-.76-.63-1.27-.83-.39-.15-.97-.33-2.05-.38C15.5 3.86 15.15 3.86 12 3.86zm0 2.7a5.44 5.44 0 110 10.88 5.44 5.44 0 010-10.88zm0 1.7a3.74 3.74 0 100 7.48 3.74 3.74 0 000-7.48zm5.66-1.95a1.27 1.27 0 110 2.54 1.27 1.27 0 010-2.54z" />
      </svg>
    );
  }
  if (k.includes('facebook')) {
    return (
      <svg {...common}>
        <path d="M13.4 22v-8.3h2.8l.4-3.2h-3.2V8.4c0-.93.26-1.56 1.6-1.56h1.7V3.96c-.3-.04-1.32-.13-2.5-.13-2.48 0-4.18 1.51-4.18 4.3v2.4H7.2v3.18h2.82V22h3.38z" />
      </svg>
    );
  }
  if (k.includes('twitter') || k === 'x') {
    return (
      <svg {...common}>
        <path d="M18.2 3H21l-6.5 7.4L22 21h-5.9l-4.6-6-5.3 6H3.4l7-7.9L2.6 3h6L13 8.5 18.2 3zm-1 16h1.6L7.8 4.7H6L17.2 19z" />
      </svg>
    );
  }
  if (k.includes('youtube')) {
    return (
      <svg {...common}>
        <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5A3 3 0 00.5 6.2C0 8 0 12 0 12s0 4 .5 5.8a3 3 0 002.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 002.1-2.1C24 16 24 12 24 12s0-4-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
      </svg>
    );
  }
  if (k.includes('spotify')) {
    return (
      <svg {...common}>
        <path d="M12 0a12 12 0 100 24 12 12 0 000-24zm5.5 17.3c-.2.4-.7.5-1.1.3-3-1.8-6.8-2.2-11.3-1.2-.5.1-.9-.2-1-.7-.1-.5.2-.9.7-1 4.9-1.1 9.1-.6 12.4 1.4.5.2.6.7.3 1.2zm1.5-3.3c-.3.4-.9.6-1.4.3-3.5-2.1-8.8-2.7-12.9-1.5-.6.2-1.2-.2-1.4-.8-.2-.6.2-1.2.8-1.4 4.7-1.4 10.5-.7 14.6 1.8.5.3.6.9.3 1.6zm.1-3.5C15.1 8.1 8.6 7.8 4.8 9c-.7.2-1.5-.2-1.7-.9-.2-.7.2-1.5.9-1.7 4.4-1.4 11.5-1.1 16 1.6.7.4.9 1.3.5 1.9-.4.7-1.3.9-2 .5z" />
      </svg>
    );
  }
  if (k.includes('soundcloud')) {
    return (
      <svg {...common}>
        <path d="M22 14.5a3.5 3.5 0 01-3.5 3.5h-7.7V8.6c2-.7 4.2.1 5.6 1.7.7-.3 1.6-.5 2.4-.4a3.5 3.5 0 013.2 3.5c0 .4-.1.7 0 1.1zM9.4 18H8.7V10c.2 0 .5.1.7.2V18zm-1.7 0H7V11.2c.2-.1.4-.2.7-.3V18zm-1.7 0h-.7v-6.4c.2.2.4.4.7.5V18zm-1.7 0h-.7v-5.9l.7-1.1V18zm-1.7 0H1.6V14l.4-1.5.6 1.6V18z" />
      </svg>
    );
  }
  if (k.includes('linkedin')) {
    return (
      <svg {...common}>
        <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5V9h3v10zM6.5 7.7a1.7 1.7 0 110-3.4 1.7 1.7 0 010 3.4zM19 19h-3v-5.4c0-1.3-.5-2.1-1.6-2.1-1.2 0-1.9.8-1.9 2.1V19h-3V9h3v1.3c.5-.8 1.5-1.5 3-1.5 2.2 0 3.5 1.5 3.5 4V19z" />
      </svg>
    );
  }
  if (k.includes('tiktok')) {
    return (
      <svg {...common}>
        <path d="M19.5 9.5a6.7 6.7 0 01-3.9-1.3v6c0 3.3-2.6 6-5.9 6-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c.3 0 .6 0 .9.1v3.1c-.3-.1-.6-.2-.9-.2a3 3 0 100 5.9c1.7 0 3-1.3 3-3V2.5h2.9c0 .3 0 .6.1.8a4 4 0 003.8 3.2v3z" />
      </svg>
    );
  }
  if (k.includes('apple')) {
    return (
      <svg {...common}>
        <path d="M18.6 17c-.4 1-.9 1.9-1.7 2.8-.9 1.2-1.8 1.9-3 1.9-1.1 0-1.6-.4-3-.4-1.4 0-1.9.4-3 .4-1.2 0-2.2-.7-3-1.9-2-2.6-2.6-7.4.5-10.3.9-1 2.1-1.6 3.4-1.6 1.2 0 2.4.5 3 .5.6 0 2.1-.7 3.5-.5 1.4.1 2.5.7 3.2 1.6-2.8 1.7-2.3 5.5.5 7.1zm-3.8-13c-.6.7-1.5 1.2-2.4 1.1-.1-1 .3-2 .9-2.6.6-.7 1.6-1.2 2.4-1.2 0 1 .3 2-.9 2.7z" />
      </svg>
    );
  }
  // Generic link icon
  return (
    <svg {...common} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72" />
    </svg>
  );
}

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [media, setMedia] = useState<PostMedia[]>([]);

  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [selectedMedia, setSelectedMedia] = useState<PostMedia | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState<Profile[]>([]);
  const [followingList, setFollowingList] = useState<Profile[]>([]);
  const [myFollowingIds, setMyFollowingIds] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<'media' | 'about'>('media');
  const [counts, setCounts] = useState({ posts: 0, followers: 0, following: 0 });

  function profilePath(user: Profile) {
    const slug = user.handle ?? user.display_name?.trim().toLowerCase().replace(/\s+/g, '') ?? user.id;
    return `/profile/${slug}`;
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        router.push('/login');
        return;
      }
      try {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(p as Profile);

        const c = await fetchProfileCounts(user.id);
        setCounts(c);

        const { data: myFollows } = await supabase.from('followers').select('following_id').eq('follower_id', user.id);
        setMyFollowingIds(myFollows?.map((f) => f.following_id) ?? []);

        const [{ data: a }, { data: s }, { data: sk }, { data: posts }, { data: r }] = await Promise.all([
          supabase.from('achievements').select('*').eq('profile_id', user.id).order('created_at', { ascending: false }),
          supabase.from('shows').select('*').eq('profile_id', user.id).order('event_date', { ascending: false }),
          supabase.from('skills').select('*').eq('profile_id', user.id).order('created_at', { ascending: false }),
          supabase.from('posts').select('id, media_url, media_type, caption, kind, created_at').eq('profile_id', user.id).in('kind', ['post', 'bit']).not('media_url', 'is', null).order('created_at', { ascending: false }),
          supabase.from('recommendations').select('*').eq('profile_id', user.id).order('created_at', { ascending: false }),
        ]);
        setAchievements((a ?? []) as Achievement[]);
        setShows((s ?? []) as Show[]);
        setSkills((sk ?? []) as Skill[]);
        setMedia((posts ?? []) as PostMedia[]);
        setRecommendations((r ?? []) as Recommendation[]);
      } catch (e: unknown) {
        console.error('PROFILE LOAD ERROR:', e);
        setErr(e instanceof Error ? e.message : 'Failed to load profile');
      }
      setLoading(false);
    })();
  }, [router]);

  async function fetchProfileCounts(userId: string) {
    const [postsRes, followersRes, followingRes] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('profile_id', userId),
      supabase.from('followers').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('followers').select('follower_id', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);
    return {
      posts: postsRes.count || 0,
      followers: followersRes.count || 0,
      following: followingRes.count || 0,
    };
  }

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    try {
      const file = e.target.files?.[0];
      if (!file || !profile) return;
      setUploading(true);
      const ext = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${ext}`;
      const filePath = `profiles/${profile.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
      const mediaType = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image';
      await supabase.from('posts').insert({
        profile_id: profile.id,
        media_url: urlData.publicUrl,
        media_type: mediaType,
        kind: 'post',
      });
      const { data: posts } = await supabase
        .from('posts')
        .select('id, media_url, media_type, caption, kind, created_at')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });
      setMedia((posts ?? []) as PostMedia[]);
    } catch (err) {
      console.error(err);
      alert('Failed to upload media');
    } finally {
      setUploading(false);
    }
  }

  async function deleteMedia(item: PostMedia) {
    if (!item.media_url) return;
    const storagePath = extractStoragePath(item.media_url);
    if (storagePath) await supabase.storage.from('media').remove([storagePath]);
    await supabase.from('posts').delete().eq('id', item.id);
    setMedia((prev) => prev.filter((m) => m.id !== item.id));
    setSelectedMedia(null);
  }

  async function loadFollowers() {
    if (!profile) return;
    const { data, error } = (await supabase
      .from('followers')
      .select('follower_id, profiles:follower_id(*)')
      .eq('following_id', profile.id)) as unknown as { data: FollowerRow[] | null; error: Error | null };
    if (!error && data) setFollowersList(data.map((r) => r.profiles).filter((p): p is Profile => p !== null));
    setShowFollowersModal(true);
  }

  async function loadFollowing() {
    if (!profile) return;
    const { data, error } = (await supabase
      .from('followers')
      .select('following_id, profiles:following_id(*)')
      .eq('follower_id', profile.id)) as unknown as { data: FollowingRow[] | null; error: Error | null };
    if (!error && data) setFollowingList(data.map((r) => r.profiles).filter((p): p is Profile => p !== null));
    setShowFollowingModal(true);
  }

  async function toggleFollowFromModal(targetId: string) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return alert('Login required.');
    const me = auth.user.id;
    if (myFollowingIds.includes(targetId)) {
      await supabase.from('followers').delete().eq('follower_id', me).eq('following_id', targetId);
      setMyFollowingIds((prev) => prev.filter((id) => id !== targetId));
    } else {
      await supabase.from('followers').insert({ follower_id: me, following_id: targetId });
      setMyFollowingIds((prev) => [...prev, targetId]);
    }
  }

  function openMedia(i: number) {
    setSelectedIndex(i);
    setSelectedMedia(media[i]);
  }
  function nextMedia() {
    const next = (selectedIndex + 1) % media.length;
    setSelectedIndex(next);
    setSelectedMedia(media[next]);
  }
  function prevMedia() {
    const prev = (selectedIndex - 1 + media.length) % media.length;
    setSelectedIndex(prev);
    setSelectedMedia(media[prev]);
  }

  if (loading) {
    return (
      <main className="page page-narrow">
        <Card className="flex items-center gap-3">
          <Spinner size={16} />
          <span className="text-sm text-ink-muted">Loading your profile…</span>
        </Card>
      </main>
    );
  }
  if (err) {
    return (
      <main className="page page-narrow">
        <Card>
          <p className="text-sm font-medium text-danger">Couldn&apos;t load profile</p>
          <p className="mt-1 text-sm text-ink-muted">{err}</p>
        </Card>
      </main>
    );
  }
  if (!profile) {
    return (
      <main className="page page-narrow">
        <EmptyState title="No profile found" description="Please sign in again." />
      </main>
    );
  }

  const username = profile.handle ?? profile.display_name?.toLowerCase().replace(/\s+/g, '') ?? profile.id.slice(0, 8);
  const genres = profile.genres ?? [];
  const publicProfileUrl = typeof window !== 'undefined' ? `${window.location.origin}/profile/${username}` : '';
  const validLinks = profile.links ? Object.entries(profile.links).filter(([, v]) => !!v) : [];

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: profile?.display_name ?? 'Artist on Arteve',
          text: `Check out ${profile?.display_name ?? 'this artist'} on Arteve`,
          url: publicProfileUrl,
        });
      } else {
        await navigator.clipboard.writeText(publicProfileUrl);
        alert('Profile link copied to clipboard');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  }

  return (
    <main className="w-full mx-auto" style={{ maxWidth: 720 }}>
      <div className="px-4 md:px-6 pt-5 pb-8">
        {/* ============ AVATAR + STATS ROW ============ */}
        <div className="flex items-center gap-5">
          <div className="shrink-0">
            <img
              src={profile.avatar_url ?? '/default-avatar.png'}
              alt={profile.display_name ?? 'Profile'}
              className="h-24 w-24 rounded-full object-cover ring-1 ring-line"
            />
          </div>

          <div className="flex-1 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-semibold text-ink-strong leading-tight">{abbreviateCount(counts.posts)}</p>
              <p className="text-xs text-ink-muted mt-0.5">Posts</p>
            </div>
            <button onClick={loadFollowers} className="rounded-lg hover:bg-surface-sunken transition py-1">
              <p className="text-lg font-semibold text-ink-strong leading-tight">{abbreviateCount(counts.followers)}</p>
              <p className="text-xs text-ink-muted mt-0.5">Followers</p>
            </button>
            <button onClick={loadFollowing} className="rounded-lg hover:bg-surface-sunken transition py-1">
              <p className="text-lg font-semibold text-ink-strong leading-tight">{abbreviateCount(counts.following)}</p>
              <p className="text-xs text-ink-muted mt-0.5">Following</p>
            </button>
          </div>
        </div>

        {/* ============ NAME + BIO ============ */}
        <div className="mt-4 space-y-1">
          <h2 className="text-base font-bold text-ink-strong">{profile.display_name ?? 'Unnamed artist'}</h2>
          {profile.location && <p className="text-xs text-ink-muted">{profile.location}</p>}
          {profile.bio && <p className="text-sm text-ink whitespace-pre-line mt-2 leading-relaxed">{profile.bio}</p>}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {genres.map((g) => (
                <Badge key={g} tone="brand">{g}</Badge>
              ))}
            </div>
          )}
          <div className="pt-1">
            <RatingDisplay profileId={profile.id} variant="inline" />
          </div>
        </div>

        {/* ============ ACTION BUTTONS ============ */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Link href="/profile/edit">
            <Button fullWidth size="sm" variant="primary">Edit</Button>
          </Link>
          <Button fullWidth size="sm" variant="outline" onClick={handleShare}>
            Share
          </Button>
          <Link href="/press-kit">
            <Button fullWidth size="sm" variant="outline">Press kit</Button>
          </Link>
        </div>

        {/* Quote */}
        {profile.quote && (
          <div className="mt-5 rounded-xl border border-accent-200 bg-accent-50 px-4 py-3">
            <p className="eyebrow text-accent-700">Artist quote</p>
            <p className="mt-1 italic text-ink-strong text-sm">&ldquo;{profile.quote}&rdquo;</p>
          </div>
        )}
      </div>

      {/* ============ TABS ============ */}
      <div className="px-4 md:px-6">
        <Tabs<'media' | 'about'>
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { value: 'media', label: 'Media' },
            { value: 'about', label: 'About' },
          ]}
          className="!gap-8 justify-center"
        />
      </div>

      {/* ============ MEDIA GRID ============ */}
      {activeTab === 'media' && (
        <section className="px-1 md:px-2 mt-1">
          {media.length === 0 ? (
            <div className="px-4 md:px-6 mt-4">
              <EmptyState
                title="No media uploaded yet"
                description="Upload your best clips or photos to make your profile shine."
                action={
                  <label>
                    <input type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleUpload} />
                    <Button variant="primary" loading={uploading} type="button" onClick={(e) => (e.currentTarget.previousElementSibling as HTMLInputElement)?.click()}>
                      Upload media
                    </Button>
                  </label>
                }
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-[2px] md:gap-1">
                {media.map((item, index) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => openMedia(index)}
                    className="group relative w-full pb-[100%] overflow-hidden bg-surface-sunken focus-visible:outline-none"
                    aria-label={`Open media ${index + 1}`}
                  >
                    {item.media_type === 'image' && (
                      <img src={item.media_url} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" alt="" />
                    )}
                    {item.media_type === 'video' && (
                      <>
                        <video src={item.media_url} muted className="absolute inset-0 w-full h-full object-cover" />
                        <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                        </span>
                      </>
                    )}
                    {item.media_type === 'audio' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[linear-gradient(135deg,var(--brand-50),var(--accent-50))] text-brand-700">
                        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                        </svg>
                        <span className="mt-1 text-[10px] font-medium uppercase tracking-wider">Audio</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Upload affordance below grid */}
              <div className="px-4 md:px-6 mt-4 flex justify-center">
                <label>
                  <input type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleUpload} />
                  <Button variant="outline" size="sm" loading={uploading} type="button" onClick={(e) => (e.currentTarget.previousElementSibling as HTMLInputElement)?.click()}>
                    Add more media
                  </Button>
                </label>
              </div>
            </>
          )}
        </section>
      )}

      {/* ============ ABOUT ============ */}
      {activeTab === 'about' && (
        <section className="mt-4 pb-8">
          {/* QUOTE BANNER */}
          {profile.quote && (
            <div className="relative w-full overflow-hidden h-44 md:h-52">
              {/* Background image: use first photo media if available, else brand gradient */}
              {(() => {
                const bgMedia = media.find((m) => m.media_type === 'image');
                return bgMedia ? (
                  <img src={bgMedia.media_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--brand-700),var(--brand-500),var(--accent-500))]" />
                );
              })()}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/60 to-black/35" />
              <div className="relative h-full flex items-center justify-center px-6 md:px-10 text-center">
                <p className="text-white text-base md:text-lg font-semibold italic leading-snug max-w-xl drop-shadow">
                  &ldquo;{profile.quote}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* ACHIEVEMENTS */}
          <div className="px-4 md:px-6 mt-6">
            <h3 className="text-base font-bold text-ink-strong mb-3">Achievements</h3>
            {achievements.length === 0 ? (
              <p className="text-sm text-ink-subtle">No achievements added yet.</p>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {achievements.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 py-3">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <circle cx="12" cy="8" r="6" />
                        <path d="M8.21 13.89 7 21l5-3 5 3-1.21-7.11" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-strong">{a.title}</p>
                      {a.description && <p className="text-sm text-ink mt-0.5">{a.description}</p>}
                      {a.year && <p className="text-xs text-ink-subtle mt-0.5">{a.year}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* RECENT SHOWS — horizontal scroll */}
          <div className="mt-6">
            <h3 className="text-base font-bold text-ink-strong mb-3 px-4 md:px-6">Recent shows</h3>
            {shows.length === 0 ? (
              <p className="text-sm text-ink-subtle px-4 md:px-6">No shows added yet.</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto px-4 md:px-6 pb-2 scroll-smooth snap-x snap-mandatory">
                {shows.map((s, i) => {
                  // Cycle through media as visual for each show card if no dedicated show image
                  const bgMedia = media.filter((m) => m.media_type === 'image')[i % Math.max(1, media.filter((m) => m.media_type === 'image').length)];
                  return (
                    <article
                      key={s.id}
                      className="relative shrink-0 w-56 md:w-64 h-44 rounded-2xl overflow-hidden border border-line bg-ink-strong snap-start"
                    >
                      {bgMedia ? (
                        <img src={bgMedia.media_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--brand-700),var(--brand-500))]" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                        <p className="text-sm font-semibold leading-tight">{s.title ?? 'Show'}</p>
                        {[s.venue, s.location].filter(Boolean).length > 0 && (
                          <p className="text-[11px] text-white/85 mt-0.5 line-clamp-1">
                            {[s.venue, s.location].filter(Boolean).join(', ')}
                          </p>
                        )}
                        {s.event_date && (
                          <p className="text-[10px] text-white/70 mt-0.5">
                            {new Date(s.event_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* SKILLS */}
          <div className="px-4 md:px-6 mt-6">
            <h3 className="text-base font-bold text-ink-strong mb-3">Skills</h3>
            {skills.length === 0 ? (
              <p className="text-sm text-ink-subtle">No skills added yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {skills.map((sk) => (
                  <li key={sk.id} className="flex items-baseline gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-ink-strong shrink-0" />
                    <p className="text-sm text-ink">
                      <span className="font-semibold text-ink-strong">{sk.skill}</span>
                      {sk.level && <span className="text-ink-muted"> — {sk.level}</span>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* RECOMMENDATIONS */}
          <div className="px-4 md:px-6 mt-6">
            <h3 className="text-base font-bold text-ink-strong mb-3">Recommendations</h3>
            {recommendations.length === 0 ? (
              <p className="text-sm text-ink-subtle">No recommendations yet.</p>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {recommendations.map((r) => (
                  <li key={r.id} className="py-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-sunken text-ink-muted text-xs font-semibold">
                        {r.author?.slice(0, 1).toUpperCase() ?? '?'}
                      </div>
                      <p className="text-sm font-semibold text-ink-strong">{r.author ?? 'Anonymous'}</p>
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-brand" fill="currentColor" aria-hidden>
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="0" />
                        <path fill="currentColor" d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1.06 14.54L6.4 12l1.41-1.41 3.13 3.12 6.25-6.25L18.6 8.87l-7.66 7.67z" />
                      </svg>
                    </div>
                    <p className="text-sm text-ink leading-relaxed">&ldquo;{r.content}&rdquo;</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* REVIEWS (booking reviews aggregator) */}
          {profile.id && (
            <div className="px-4 md:px-6 mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-ink-strong">Reviews</h3>
                <RatingDisplay profileId={profile.id} variant="inline" />
              </div>
              <ReviewList profileId={profile.id} limit={3} />
            </div>
          )}

          {/* SOCIAL LINKS */}
          {validLinks.length > 0 && (
            <div className="px-4 md:px-6 mt-6">
              <h3 className="text-base font-bold text-ink-strong mb-3">Social Links</h3>
              <div className="flex flex-wrap items-center gap-3">
                {validLinks.map(([key, value]) => (
                  <a
                    key={key}
                    href={value as string}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={key}
                    title={key}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white shadow-sm hover:scale-105 transition"
                    style={{ backgroundColor: socialColor(key) }}
                  >
                    <SocialIcon name={key} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ============ MEDIA LIGHTBOX ============ */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-strong/85 backdrop-blur-sm p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 cursor-default"
            onClick={() => setSelectedMedia(null)}
          />

          <div className="relative z-10 w-full max-w-3xl">
            <div className="flex items-center justify-between gap-2 mb-3">
              <Button variant="danger" size="sm" onClick={() => deleteMedia(selectedMedia)}>
                Delete
              </Button>
              <button
                type="button"
                onClick={() => setSelectedMedia(null)}
                aria-label="Close"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black">
              {selectedMedia.media_type === 'image' && (
                <img src={selectedMedia.media_url} className="w-full max-h-[80vh] object-contain" alt="" />
              )}
              {selectedMedia.media_type === 'video' && (
                <video src={selectedMedia.media_url} controls className="w-full max-h-[80vh]" />
              )}
              {selectedMedia.media_type === 'audio' && (
                <div className="p-6 bg-surface">
                  <AudioPlayer src={selectedMedia.media_url} title={selectedMedia.caption ?? 'Audio'} />
                </div>
              )}
            </div>

            {media.length > 1 && (
              <>
                <button type="button" onClick={prevMedia} aria-label="Previous" className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <button type="button" onClick={nextMedia} aria-label="Next" className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============ FOLLOWERS / FOLLOWING MODAL ============ */}
      <Modal open={showFollowersModal} onClose={() => setShowFollowersModal(false)} title="Followers">
        {followersList.length === 0 ? (
          <p className="text-sm text-ink-subtle">No followers yet.</p>
        ) : (
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
            {followersList.map((user) => (
              <li key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-sunken">
                <Link href={profilePath(user)} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar src={user.avatar_url} alt={user.display_name ?? ''} size="md" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-strong truncate">{user.display_name}</p>
                    <p className="text-xs text-ink-subtle truncate">@{user.handle ?? user.display_name?.toLowerCase().replace(/\s+/g, '')}</p>
                  </div>
                </Link>
                <Button size="sm" variant={myFollowingIds.includes(user.id) ? 'outline' : 'primary'} onClick={() => toggleFollowFromModal(user.id)}>
                  {myFollowingIds.includes(user.id) ? 'Unfollow' : 'Follow'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal open={showFollowingModal} onClose={() => setShowFollowingModal(false)} title="Following">
        {followingList.length === 0 ? (
          <p className="text-sm text-ink-subtle">Not following anyone yet.</p>
        ) : (
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
            {followingList.map((user) => (
              <li key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-sunken">
                <Link href={profilePath(user)} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar src={user.avatar_url} alt={user.display_name ?? ''} size="md" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-strong truncate">{user.display_name}</p>
                    <p className="text-xs text-ink-subtle truncate">@{user.handle ?? user.display_name?.toLowerCase().replace(/\s+/g, '')}</p>
                  </div>
                </Link>
                <Button size="sm" variant={myFollowingIds.includes(user.id) ? 'outline' : 'primary'} onClick={() => toggleFollowFromModal(user.id)}>
                  {myFollowingIds.includes(user.id) ? 'Unfollow' : 'Follow'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </main>
  );
}
