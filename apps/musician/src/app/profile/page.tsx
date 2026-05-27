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
      {/* Sticky username header */}
      <header className="sticky top-14 md:top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-line bg-surface/90 backdrop-blur">
        <div className="w-8" />
        <h1 className="text-base font-semibold text-ink-strong truncate">@{username}</h1>
        <Link href="/profile/edit" aria-label="Edit profile" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
          </svg>
        </Link>
      </header>

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
        <section className="px-4 md:px-6 mt-4 space-y-4 pb-8">
          {/* About + links */}
          <Card>
            {profile.bio ? (
              <>
                <h2 className="section-title mb-2">About</h2>
                <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{profile.bio}</p>
              </>
            ) : (
              <EmptyState title="No bio yet" description="Tell organizers a bit about yourself in your profile settings." />
            )}

            {validLinks.length > 0 && (
              <div className="mt-5 pt-5 border-t border-line">
                <h3 className="text-sm font-semibold text-ink-strong mb-2">Links</h3>
                <div className="flex flex-wrap gap-2">
                  {validLinks.map(([key, value]) => (
                    <a
                      key={key}
                      href={value as string}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken transition"
                    >
                      {key}
                      <svg viewBox="0 0 24 24" className="h-3 w-3 text-ink-subtle" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 17 17 7" /><path d="M7 7h10v10" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <h2 className="section-title mb-3">Achievements</h2>
              {achievements.length === 0 ? (
                <p className="text-sm text-ink-subtle">No achievements yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {achievements.map((a) => (
                    <li key={a.id} className="rounded-lg border border-line bg-surface-sunken px-3 py-3">
                      <p className="font-medium text-ink-strong text-sm">{a.title}</p>
                      {a.description && <p className="text-xs text-ink mt-0.5">{a.description}</p>}
                      {a.year && <p className="text-[11px] text-ink-subtle mt-1">{a.year}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h2 className="section-title mb-3">Recent shows</h2>
              {shows.length === 0 ? (
                <p className="text-sm text-ink-subtle">No shows yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {shows.map((s) => (
                    <li key={s.id} className="rounded-lg border border-line bg-surface-sunken px-3 py-3">
                      <p className="font-medium text-ink-strong text-sm">{s.title}</p>
                      <p className="text-xs text-ink mt-0.5">{[s.venue, s.location].filter(Boolean).join(', ')}</p>
                      {s.event_date && (
                        <p className="text-[11px] text-ink-subtle mt-1">{new Date(s.event_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h2 className="section-title mb-3">Skills</h2>
              {skills.length === 0 ? (
                <p className="text-sm text-ink-subtle">No skills yet.</p>
              ) : (
                <ul className="space-y-2">
                  {skills.map((sk) => (
                    <li key={sk.id} className="flex items-center justify-between rounded-lg border border-line bg-surface-sunken px-3 py-2.5">
                      <span className="text-sm font-medium text-ink-strong">{sk.skill}</span>
                      {sk.level && <Badge tone="brand">{sk.level}</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-title">Reviews</h2>
                <RatingDisplay profileId={profile.id} variant="inline" />
              </div>
              <ReviewList profileId={profile.id} limit={5} />
            </Card>

            <Card className="md:col-span-2">
              <h2 className="section-title mb-3">Recommendations</h2>
              {recommendations.length === 0 ? (
                <p className="text-sm text-ink-subtle">No recommendations yet.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {recommendations.map((r) => (
                    <blockquote key={r.id} className="rounded-lg border-l-4 border-accent-300 bg-surface-sunken px-4 py-3">
                      <p className="italic text-ink-strong text-sm">&ldquo;{r.content}&rdquo;</p>
                      {r.author && <p className="text-[11px] mt-1.5 text-ink-subtle">— {r.author}</p>}
                    </blockquote>
                  ))}
                </div>
              )}
            </Card>
          </div>
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
