'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import { RatingDisplay, ReviewList } from '@arteve/shared/reviews';
import { AudioPlayer } from '@arteve/shared/media/AudioPlayer';
import { sendNotification } from '@arteve/shared/notifications';
import {
  Button,
  Avatar,
  Badge,
  EmptyState,
  Tabs,
  Modal,
  SafeImage,
  Spinner,
  SocialLink,
  toast,
} from '@arteve/ui/components';

type PostMedia = {
  id: string;
  media_url: string;
  media_type: 'image' | 'video' | 'audio';
  caption: string | null;
  kind: 'post' | 'bit';
  created_at: string;
};
type Achievement = { id: string; title: string | null; description: string | null; year: number | null };
type Show = { id: string; title: string | null; venue: string | null; location: string | null; event_date: string | null };
type Skill = { id: string; skill: string | null; level: string | null };
type Recommendation = { id: string; author: string | null; content: string | null };
type BaseProfile = {
  id: string;
  role: 'musician' | 'organizer' | null;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  bio: string | null;
  genres: string[] | null;
  links: Record<string, string> | null;
  location: string | null;
  quote: string | null;
};
type FollowProfile = { id: string; display_name: string | null; handle: string | null; avatar_url: string | null };

function abbreviateCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}K`;
  return `${(n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0).replace(/\.0$/, '')}M`;
}

export default function MusicianPublicProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<BaseProfile | null>(null);
  const [posts, setPosts] = useState<PostMedia[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [counts, setCounts] = useState({ posts: 0, followers: 0, following: 0 });

  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'media' | 'about'>('media');

  const [selectedMedia, setSelectedMedia] = useState<PostMedia | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [myFollowingIds, setMyFollowingIds] = useState<string[]>([]);

  const [showFollowModal, setShowFollowModal] = useState<'followers' | 'following' | null>(null);
  const [followersList, setFollowersList] = useState<FollowProfile[]>([]);
  const [followingList, setFollowingList] = useState<FollowProfile[]>([]);

  useEffect(() => {
    if (!handle) return;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: myProfile } = await supabase
        .from('profiles').select('id, handle').eq('id', auth.user.id).maybeSingle();
      if (myProfile?.handle === handle) router.replace('/profile');
    })();
  }, [handle, router]);

  useEffect(() => {
    if (!handle) return;
    (async () => {
      try {
        const { data: p, error: pErr } = await supabase
          .from('profiles').select('*').eq('handle', handle).maybeSingle();
        if (pErr || !p) throw new Error('Profile not found');
        const prof = p as BaseProfile;
        setProfile(prof);

        const [postsCntRes, followersRes, followingRes] = await Promise.all([
          supabase.from('posts').select('id', { count: 'exact', head: true }).eq('profile_id', prof.id),
          supabase.from('followers').select('follower_id', { count: 'exact', head: true }).eq('following_id', prof.id),
          supabase.from('followers').select('follower_id', { count: 'exact', head: true }).eq('follower_id', prof.id),
        ]);
        setCounts({
          posts: postsCntRes.count || 0,
          followers: followersRes.count || 0,
          following: followingRes.count || 0,
        });

        const { data: auth } = await supabase.auth.getUser();
        if (auth.user) {
          setViewerId(auth.user.id);
          const { data: myFollows } = await supabase
            .from('followers').select('following_id').eq('follower_id', auth.user.id);
          setMyFollowingIds(myFollows?.map((f) => f.following_id) ?? []);
          const { data: followData } = await supabase
            .from('followers').select('*')
            .eq('follower_id', auth.user.id).eq('following_id', prof.id).maybeSingle();
          setIsFollowing(!!followData);
        }

        const [{ data: postData }, { data: a }, { data: s }, { data: sk }, { data: r }] = await Promise.all([
          supabase
            .from('posts').select('id, media_url, media_type, caption, kind, created_at')
            .eq('profile_id', prof.id).in('kind', ['post', 'bit'])
            .not('media_url', 'is', null)
            .order('created_at', { ascending: false }),
          supabase.from('achievements').select('*').eq('profile_id', prof.id).order('created_at', { ascending: false }),
          supabase.from('shows').select('*').eq('profile_id', prof.id).order('event_date', { ascending: false }),
          supabase.from('skills').select('*').eq('profile_id', prof.id).order('created_at', { ascending: false }),
          supabase.from('recommendations').select('*').eq('profile_id', prof.id).order('created_at', { ascending: false }),
        ]);
        setPosts((postData ?? []) as PostMedia[]);
        setAchievements((a ?? []) as Achievement[]);
        setShows((s ?? []) as Show[]);
        setSkills((sk ?? []) as Skill[]);
        setRecommendations((r ?? []) as Recommendation[]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [handle]);

  async function toggleFollow() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { toast.error('Login required.'); return; }
    if (!profile) return;
    if (auth.user.id === profile.id) return;

    // Optimistic flip first, then reconcile with the DB
    const prevFollowing = isFollowing;
    const prevCount = counts.followers;
    setIsFollowing(!prevFollowing);
    setCounts((c) => ({ ...c, followers: c.followers + (prevFollowing ? -1 : 1) }));

    const { error } = prevFollowing
      ? await supabase.from('followers').delete()
          .eq('follower_id', auth.user.id).eq('following_id', profile.id)
      : await supabase.from('followers').insert({
          follower_id: auth.user.id, following_id: profile.id,
        });

    if (error) {
      // Roll back on failure
      setIsFollowing(prevFollowing);
      setCounts((c) => ({ ...c, followers: prevCount }));
      toast.error(prevFollowing ? "Couldn't unfollow" : "Couldn't follow");
      return;
    }

    // On a successful *follow* (not unfollow), notify the person.
    if (!prevFollowing) {
      const { data: me } = await supabase
        .from('profiles').select('handle, display_name').eq('id', auth.user.id).maybeSingle();
      await sendNotification({
        userId: profile.id,
        type: 'follow',
        body: `${me?.display_name || 'Someone'} started following you`,
        data: { actor_handle: me?.handle ?? null },
      });
    }
  }

  async function toggleFollowFromModal(targetId: string) {
    if (!viewerId || viewerId === targetId) return;
    const alreadyFollowing = myFollowingIds.includes(targetId);

    // Optimistic update — flip UI immediately
    setMyFollowingIds((prev) =>
      alreadyFollowing ? prev.filter((id) => id !== targetId) : [...prev, targetId]
    );

    const { error } = alreadyFollowing
      ? await supabase.from('followers').delete()
          .eq('follower_id', viewerId).eq('following_id', targetId)
      : await supabase.from('followers').insert({ follower_id: viewerId, following_id: targetId });

    if (error) {
      // Roll back
      setMyFollowingIds((prev) =>
        alreadyFollowing ? [...prev, targetId] : prev.filter((id) => id !== targetId)
      );
      toast.error(alreadyFollowing ? "Couldn't unfollow" : "Couldn't follow");
      return;
    }

    // Notify on a successful follow (parity with the main follow button).
    if (!alreadyFollowing) {
      const { data: me } = await supabase
        .from('profiles').select('handle, display_name').eq('id', viewerId).maybeSingle();
      await sendNotification({
        userId: targetId,
        type: 'follow',
        body: `${me?.display_name || 'Someone'} started following you`,
        data: { actor_handle: me?.handle ?? null },
      });
    }
  }

  async function loadFollowers() {
    if (!profile) return;
    const { data } = await supabase
      .from('followers')
      .select('profiles!followers_follower_id_fkey ( id, display_name, handle, avatar_url )')
      .eq('following_id', profile.id);
    setFollowersList((data ?? []).flatMap((d) => d.profiles).filter(Boolean) as FollowProfile[]);
    setShowFollowModal('followers');
  }
  async function loadFollowing() {
    if (!profile) return;
    const { data } = await supabase
      .from('followers')
      .select('profiles!followers_following_id_fkey ( id, display_name, handle, avatar_url )')
      .eq('follower_id', profile.id);
    setFollowingList((data ?? []).flatMap((d) => d.profiles).filter(Boolean) as FollowProfile[]);
    setShowFollowModal('following');
  }

  function openMedia(i: number) { setSelectedIndex(i); setSelectedMedia(posts[i]); }
  function nextMedia() { const next = (selectedIndex + 1) % posts.length; setSelectedIndex(next); setSelectedMedia(posts[next]); }
  function prevMedia() { const prev = (selectedIndex - 1 + posts.length) % posts.length; setSelectedIndex(prev); setSelectedMedia(posts[prev]); }

  if (loading) {
    return (
      <main className="px-4 py-6">
        <div className="card card-padded flex items-center gap-3">
          <Spinner size={16} />
          <span className="text-sm text-ink-muted">Loading profile…</span>
        </div>
      </main>
    );
  }
  if (err || !profile) {
    return (
      <main className="px-4 py-6">
        <EmptyState title="Couldn't load profile" description={err ?? 'Profile not found.'} />
      </main>
    );
  }

  const genres = profile.genres ?? [];
  const validLinks = profile.links ? Object.entries(profile.links).filter(([, v]) => !!v) : [];
  const isOwn = viewerId === profile.id;

  return (
    <main className="w-full mx-auto" style={{ maxWidth: 720 }}>
      <div className="px-4 md:px-6 pt-5 pb-8">
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
              <p className="text-lg font-bold text-ink-strong leading-tight tabular">{abbreviateCount(counts.posts)}</p>
              <p className="text-xs text-ink-muted mt-0.5">Posts</p>
            </div>
            <button onClick={loadFollowers} className="rounded-lg hover:bg-surface-sunken transition py-1">
              <p className="text-lg font-bold text-ink-strong leading-tight tabular">{abbreviateCount(counts.followers)}</p>
              <p className="text-xs text-ink-muted mt-0.5">Followers</p>
            </button>
            <button onClick={loadFollowing} className="rounded-lg hover:bg-surface-sunken transition py-1">
              <p className="text-lg font-bold text-ink-strong leading-tight tabular">{abbreviateCount(counts.following)}</p>
              <p className="text-xs text-ink-muted mt-0.5">Following</p>
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-1">
          <h2 className="text-base font-bold text-ink-strong">{profile.display_name ?? 'Unnamed'}</h2>
          {profile.location && <p className="text-xs text-ink-muted">{profile.location}</p>}
          {profile.bio && <p className="text-sm text-ink whitespace-pre-line mt-2 leading-relaxed">{profile.bio}</p>}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {genres.map((g) => (<Badge key={g} tone="brand">{g}</Badge>))}
            </div>
          )}
          <div className="pt-1">
            <RatingDisplay profileId={profile.id} variant="inline" />
          </div>
        </div>

        {/* Musician viewing other: Message + Follow (no Book) */}
        {!isOwn && (
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link href={`/chat/new?user=${profile.handle ?? ''}`}>
              <Button fullWidth size="sm" variant="outline">Message</Button>
            </Link>
            <Button fullWidth size="sm" variant={isFollowing ? 'outline' : 'primary'} onClick={toggleFollow}>
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          </div>
        )}
      </div>

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

      {activeTab === 'media' && (
        <section className="px-1 md:px-2 mt-1">
          {posts.length === 0 ? (
            <div className="px-4 md:px-6 mt-4">
              <EmptyState title="No media yet" description="This profile hasn't uploaded anything." />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-[2px] md:gap-1">
              {posts.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openMedia(index)}
                  className="group relative w-full pb-[100%] overflow-hidden bg-surface-sunken focus-visible:outline-none"
                  aria-label={`Open media ${index + 1}`}
                >
                  {item.media_url && item.media_type === 'image' && (
                    <SafeImage
                      src={item.media_url}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 33vw, 240px"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                  {item.media_url && item.media_type === 'video' && (
                    <>
                      <video src={item.media_url} muted className="absolute inset-0 w-full h-full object-cover" />
                      <span className="absolute top-1.5 right-1.5 inline-flex items-center rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                      </span>
                    </>
                  )}
                  {item.media_url && item.media_type === 'audio' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[linear-gradient(135deg,var(--brand-50),var(--accent-50))] text-brand-700">
                      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                      </svg>
                      <span className="mt-1 text-[10px] font-medium uppercase tracking-wider">Audio</span>
                    </div>
                  )}
                  {/* Fallback: legacy posts without a recognized media_type or
                      missing URL. Try the URL anyway (most likely an image) and
                      fall back to a placeholder icon. */}
                  {(!item.media_url || !['image', 'video', 'audio'].includes(item.media_type ?? '')) && (
                    item.media_url ? (
                      <SafeImage
                        src={item.media_url}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 33vw, 240px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-surface-sunken text-ink-disabled">
                        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-5-5L5 21" />
                        </svg>
                      </div>
                    )
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'about' && (
        <section className="mt-4 pb-8">
          {profile.quote && (
            <div className="relative w-full overflow-hidden h-44 md:h-52">
              {(() => {
                const bgMedia = posts.find((m) => m.media_type === 'image');
                return bgMedia ? (
                  <Image src={bgMedia.media_url} alt="" fill sizes="100vw" className="object-cover" />
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

          {achievements.length > 0 && (
            <div className="px-4 md:px-6 mt-6">
              <h3 className="text-base font-bold text-ink-strong mb-3">Achievements</h3>
              <ul className="divide-y divide-line border-y border-line">
                {achievements.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 py-3">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="6" /><path d="M8.21 13.89 7 21l5-3 5 3-1.21-7.11" />
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
            </div>
          )}

          {shows.length > 0 && (
            <div className="mt-6">
              <h3 className="text-base font-bold text-ink-strong mb-3 px-4 md:px-6">Recent shows</h3>
              <div className="flex gap-3 overflow-x-auto px-4 md:px-6 pb-2 scroll-smooth snap-x snap-mandatory">
                {shows.map((s, i) => {
                  const imgs = posts.filter((m) => m.media_type === 'image');
                  const bgMedia = imgs[i % Math.max(1, imgs.length)];
                  return (
                    <article key={s.id} className="relative shrink-0 w-56 md:w-64 h-44 rounded-2xl overflow-hidden border border-line bg-ink-strong snap-start">
                      {bgMedia ? (
                        <Image src={bgMedia.media_url} alt="" fill sizes="100vw" className="object-cover" />
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
            </div>
          )}

          {skills.length > 0 && (
            <div className="px-4 md:px-6 mt-6">
              <h3 className="text-base font-bold text-ink-strong mb-3">Skills</h3>
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
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="px-4 md:px-6 mt-6">
              <h3 className="text-base font-bold text-ink-strong mb-3">Recommendations</h3>
              <ul className="divide-y divide-line border-y border-line">
                {recommendations.map((r) => (
                  <li key={r.id} className="py-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-sunken text-ink-muted text-xs font-semibold">
                        {r.author?.slice(0, 1).toUpperCase() ?? '?'}
                      </div>
                      <p className="text-sm font-semibold text-ink-strong">{r.author ?? 'Anonymous'}</p>
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-brand" fill="currentColor" aria-hidden>
                        <path fill="currentColor" d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1.06 14.54L6.4 12l1.41-1.41 3.13 3.12 6.25-6.25L18.6 8.87l-7.66 7.67z" />
                      </svg>
                    </div>
                    <p className="text-sm text-ink leading-relaxed">&ldquo;{r.content}&rdquo;</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="px-4 md:px-6 mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-ink-strong">Reviews</h3>
              <RatingDisplay profileId={profile.id} variant="inline" />
            </div>
            <ReviewList profileId={profile.id} limit={3} />
          </div>

          {validLinks.length > 0 && (
            <div className="px-4 md:px-6 mt-6">
              <h3 className="text-base font-bold text-ink-strong mb-3">Social Links</h3>
              <div className="flex flex-wrap items-center gap-3">
                {validLinks.map(([key, value]) => (
                  <SocialLink key={key} name={key} href={value as string} />
                ))}
              </div>
            </div>
          )}

          {!profile.quote && !achievements.length && !shows.length && !skills.length && !recommendations.length && !validLinks.length && (
            <div className="px-4 md:px-6 mt-4">
              {profile.bio ? (
                <>
                  <h3 className="text-base font-bold text-ink-strong mb-3">About</h3>
                  <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{profile.bio}</p>
                </>
              ) : (
                <EmptyState title="No about info yet" />
              )}
            </div>
          )}
        </section>
      )}

      {selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-strong/85 backdrop-blur-sm p-4">
          <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={() => setSelectedMedia(null)} />
          <div className="relative z-10 w-full max-w-3xl">
            <div className="flex items-center justify-end mb-3">
              <button type="button" onClick={() => setSelectedMedia(null)} aria-label="Close"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition">
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
            {posts.length > 1 && (
              <>
                <button type="button" onClick={prevMedia} aria-label="Previous"
                  className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <button type="button" onClick={nextMedia} aria-label="Next"
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <Modal
        open={showFollowModal !== null}
        onClose={() => setShowFollowModal(null)}
        title={showFollowModal === 'followers' ? 'Followers' : 'Following'}
      >
        {(() => {
          const list = showFollowModal === 'followers' ? followersList : followingList;
          if (list.length === 0) return <p className="text-sm text-ink-subtle">No one here yet.</p>;
          return (
            <ul className="space-y-2">
              {list.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-sunken">
                  <Link href={`/profile/${p.handle ?? p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar src={p.avatar_url} alt={p.display_name ?? ''} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-strong truncate">{p.display_name}</p>
                      <p className="text-xs text-ink-subtle truncate">@{p.handle}</p>
                    </div>
                  </Link>
                  {viewerId !== p.id && (
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
    </main>
  );
}
