'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import { RatingDisplay, ReviewList } from '@arteve/shared/reviews';
import { ProfileCompleteness } from '@arteve/shared/profile/completeness';
import { AudioPlayer } from '@arteve/shared/media/AudioPlayer';

type Achievement = {
  id: string;
  title: string | null;
  description: string | null;
  year: number | null;
};

type Show = {
  id: string;
  title: string | null;
  venue: string | null;
  location: string | null;
  event_date: string | null;
};

type Skill = {
  id: string;
  skill: string | null;
  level: string | null;
};

type Recommendation = {
  id: string;
  author: string | null;
  content: string | null;
};

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

type FollowerRow = {
  follower_id: string;
  profiles: Profile | null;
};

type FollowingRow = {
  following_id: string;
  profiles: Profile | null;
};

/* ---------------------------------------------------------
    Extract storage path from PUBLIC URL
--------------------------------------------------------- */
function extractStoragePath(publicUrl: string): string | null {
  const marker = '/storage/v1/object/public/media/';
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return publicUrl.substring(index + marker.length);
}

/* ---------------------------------------------------------
    MAIN COMPONENT
--------------------------------------------------------- */
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

  const [counts, setCounts] = useState({
    posts: 0,
    followers: 0,
    following: 0,
  });

  function profilePath(user: Profile) {
    const slug =
      (user as unknown as Record<string, string>).handle ??
      user.display_name?.trim().toLowerCase().replace(/\s+/g, '') ??
      user.id;

    return `/profile/${slug}`;
  }

  /* ---------------------------------------------------------
      LOAD ALL PROFILE DATA
  --------------------------------------------------------- */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const { data: p } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setProfile(p as Profile);

        const c = await fetchProfileCounts(user.id);
        setCounts(c);

        const { data: myFollows } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', user.id);

        setMyFollowingIds(myFollows?.map(f => f.following_id) ?? []);

        const { data: a } = await supabase
          .from('achievements')
          .select('*')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false });
        setAchievements((a ?? []) as Achievement[]);

        const { data: s } = await supabase
          .from('shows')
          .select('*')
          .eq('profile_id', user.id)
          .order('event_date', { ascending: false });
        setShows((s ?? []) as Show[]);

        const { data: sk } = await supabase
          .from('skills')
          .select('*')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false });
        setSkills((sk ?? []) as Skill[]);

        const { data: posts } = await supabase
          .from('posts')
          .select('id, media_url, media_type, caption, kind, created_at')
          .eq('profile_id', user.id)
          .in('kind', ['post', 'bit'])
          .not('media_url', 'is', null)
          .order('created_at', { ascending: false });

        setMedia((posts ?? []) as PostMedia[]);

        const { data: r } = await supabase
          .from('recommendations')
          .select('*')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false });
        setRecommendations((r ?? []) as Recommendation[]);
      } catch (e: unknown) {
        console.error('PROFILE LOAD ERROR:', e);
        const message = e instanceof Error ? e.message : 'Failed to load profile';
        setErr(message);
      }

      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal();
    }
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 pt-10 pb-20">
        Loading…
      </main>
    );
  }
  if (err) {
    return (
      <main className="mx-auto max-w-3xl px-4 pt-10 pb-20 text-danger">
        {err}
      </main>
    );
  }
  if (!profile) {
    return (
      <main className="mx-auto max-w-3xl px-4 pt-10 pb-20">
        No profile found.
      </main>
    );
  }

  /* ---------------------------------------------------------
      UPLOAD MEDIA
  --------------------------------------------------------- */
  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    try {
      const file = e.target.files?.[0];
      if (!file || !profile) return;

      setUploading(true);

      const ext = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${ext}`;
      const filePath = `profiles/${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);

      const mediaType =
        file.type.startsWith('video') ? 'video' :
        file.type.startsWith('audio') ? 'audio' :
        'image';

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

  async function fetchProfileCounts(userId: string) {
    const supa = supabase;

    const [postsRes, followersRes, followingRes] = await Promise.all([
      supa.from('posts').select('id', { count: 'exact', head: true }).eq('profile_id', userId),
      supa
        .from('followers')
        .select('follower_id', { count: 'exact', head: true })
        .eq('following_id', userId),
      supa
        .from('followers')
        .select('follower_id', { count: 'exact', head: true })
        .eq('follower_id', userId),
    ]);

    return {
      posts: postsRes.count || 0,
      followers: followersRes.count || 0,
      following: followingRes.count || 0,
    };
  }

  /* ---------------------------------------------------------
      DELETE MEDIA
  --------------------------------------------------------- */
  async function deleteMedia(item: PostMedia) {
    if (!item.media_url) return;

    const storagePath = extractStoragePath(item.media_url);
    if (!storagePath) return;

    await supabase.storage.from('media').remove([storagePath]);
    await supabase.from('posts').delete().eq('id', item.id);

    setMedia(prev => prev.filter(m => m.id !== item.id));
    closeModal();
  }

  /* ---------------------------- Load Followers ---------------------------- */
  async function loadFollowers() {
    if (!profile) return;

    const { data, error } = (await supabase
      .from('followers')
      .select('follower_id, profiles:follower_id(*)')) as unknown as {
      data: FollowerRow[] | null;
      error: Error | null;
    };

    if (!error && data) {
      setFollowersList(
        data.map(row => row.profiles).filter((p): p is Profile => p !== null),
      );
    }

    setShowFollowersModal(true);
  }

  async function toggleFollowFromModal(targetId: string) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return alert('Login required.');

    const me = auth.user.id;

    if (myFollowingIds.includes(targetId)) {
      await supabase
        .from('followers')
        .delete()
        .eq('follower_id', me)
        .eq('following_id', targetId);

      setMyFollowingIds(prev => prev.filter(id => id !== targetId));
      setCounts(c => ({ ...c, following: c.following - 1 }));
    } else {
      await supabase.from('followers').insert({
        follower_id: me,
        following_id: targetId,
      });

      setMyFollowingIds(prev => [...prev, targetId]);
      setCounts(c => ({ ...c, following: c.following + 1 }));
    }
  }

  /* ---------------------------- Load Following ---------------------------- */
  async function loadFollowing() {
    if (!profile) return;

    const { data, error } = (await supabase
      .from('followers')
      .select('following_id, profiles:following_id(*)')) as unknown as {
      data: FollowingRow[] | null;
      error: Error | null;
    };

    if (!error && data) {
      setFollowingList(
        data.map(row => row.profiles).filter((p): p is Profile => p !== null),
      );
    }

    setShowFollowingModal(true);
  }

  /* ---------------------------------------------------------
      MODAL HANDLERS
  --------------------------------------------------------- */
  function openModal(i: number) {
    setSelectedIndex(i);
    setSelectedMedia(media[i]);
  }

  function closeModal() {
    setSelectedMedia(null);
  }

  function showNext() {
    const next = (selectedIndex + 1) % media.length;
    setSelectedIndex(next);
    setSelectedMedia(media[next]);
  }

  function showPrev() {
    const prev = (selectedIndex - 1 + media.length) % media.length;
    setSelectedIndex(prev);
    setSelectedMedia(media[prev]);
  }

  const username = profile.handle;

  const primaryMedia = media.at(0) ?? null;
  const genres = profile.genres ?? [];

  const handle =
    (profile as unknown as Record<string, string>).handle ??
    profile.display_name?.trim().toLowerCase().replace(/\s+/g, '') ??
    profile.id;

  const publicProfileUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/profile/${handle}`
      : '';
      
    async function handleShare() {
    try {
      // Prefer native share on mobile
      if (navigator.share) {
        await navigator.share({
          title: profile?.display_name ?? 'Artist on Arteve',
          text: `Check out ${profile?.display_name ?? 'this artist'} on Arteve`,
          url: publicProfileUrl,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(publicProfileUrl);
        alert('Profile link copied to clipboard');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  }


  /* ---------------------------------------------------------
      UI
  --------------------------------------------------------- */
  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      {/* PROFILE COMPLETENESS METER */}
      <ProfileCompleteness
        profile={profile}
        role="musician"
        related={{
          mediaCount: media.length,
          skillsCount: skills.length,
          showsCount: shows.length,
          achievementsCount: achievements.length,
        }}
      />

      {/* HEADER CARD (clean white hero) */}
      <section className="rounded-3xl border border-line bg-surface shadow-[0_18px_48px_rgba(15,23,42,0.06)] p-6 sm:p-7 space-y-6">
        {/* Top row: Avatar + Details */}
        <div className="flex items-start gap-6">
          <img
            src={profile.avatar_url ?? '/placeholder-avatar.png'}
            className="w-24 h-24 rounded-full object-cover border border-line-strong"
            alt="Profile avatar"
          />

          <div className="flex-1 space-y-1">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink-strong">
              {profile.display_name ?? 'Unnamed artist'}
            </h1>

            <p className="text-sm text-ink-subtle">@{username}</p>

            {profile.location && (
              <p className="text-sm text-ink-muted">{profile.location}</p>
            )}

            <div className="pt-1">
              <RatingDisplay profileId={profile.id} variant="inline" />
            </div>

            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {genres.map(g => (
                  <span
                    key={g}
                    className="px-3 py-1 rounded-full bg-surface-sunken text-sm text-ink"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {profile.bio && (
              <p className="text-ink leading-snug pt-1">
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex justify-evenly text-center mt-2">
          <div>
            <p className="text-lg font-semibold text-ink-strong">{counts.posts}</p>
            <p className="text-[11px] text-ink-muted">Posts</p>
          </div>

          <button
            onClick={loadFollowers}
            className="flex flex-col items-center hover:text-ink-strong"
          >
            <p className="text-lg font-semibold text-ink-strong">
              {counts.followers}
            </p>
            <p className="text-[11px] text-ink-muted">Followers</p>
          </button>

          <button
            onClick={loadFollowing}
            className="flex flex-col items-center hover:text-ink-strong"
          >
            <p className="text-lg font-semibold text-ink-strong">
              {counts.following}
            </p>
            <p className="text-[11px] text-ink-muted">Following</p>
          </button>
        </div>

        {/* Buttons row */}
        <div className="flex flex-wrap gap-2 justify-center mt-2">
          <Link
            href="/profile/edit"
            className="px-4 py-1.5 rounded-xl border border-line-strong font-medium hover:bg-surface-sunken"
          >
            Edit Profile
          </Link>

          <Link
            href="/gigs"
            className="px-4 py-1.5 rounded-xl border border-line-strong font-medium hover:bg-surface-sunken"
          >
            My Gigs
          </Link>

          <Link
            href="/press-kit"
            className="px-4 py-1.5 rounded-xl border border-line-strong font-medium hover:bg-surface-sunken"
          >
            Press kit
          </Link>

          <button
            onClick={handleShare}
            className="px-4 py-1.5 rounded-xl border border-line-strong font-medium hover:bg-surface-sunken"
          >
            Share
          </button>
        </div>

        {/* Quote */}
        {profile.quote && (
          <div className="px-4 py-3 rounded-xl bg-surface-sunken mt-3">
            <p className="text-[11px] uppercase tracking-wide text-ink-subtle">
              Artist Quote
            </p>
            <p className="mt-1 italic text-ink-strong">
              “{profile.quote}”
            </p>
          </div>
        )}
      </section>

      {/* TABS (Instagram-style, text-only) */}
      <div className="border-b border-line">
        <div className="flex justify-center gap-10">
          {(['media', 'about'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative pb-3 font-medium ${
                activeTab === tab
                  ? 'text-ink-strong'
                  : 'text-ink-subtle hover:text-ink'
              }`}
            >
              {tab === 'media' ? 'Media' : 'About'}
              {activeTab === tab && (
                <span className="absolute left-0 right-0 -bottom-0.5 mx-auto h-[2px] w-8 rounded-full bg-ink-strong" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* MEDIA TAB */}
      {activeTab === 'media' && (
        <section className="rounded-3xl border border-line bg-surface shadow-[0_18px_48px_rgba(15,23,42,0.04)] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-ink-strong">
                Media
              </h2>
              <p className="text-sm text-ink-subtle mt-1">
                Add photos and videos from your performances.
              </p>
            </div>

            <label className="cursor-pointer inline-flex items-center px-3 py-1.5 rounded-full border border-line-strong text-sm font-medium hover:bg-surface-sunken">
              {uploading ? 'Uploading…' : 'Upload'}
              <input
                type="file"
                accept="image/*,video/*,audio/*"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          </div>

          {media.length === 0 ? (
            <div className="border border-dashed border-line-strong rounded-2xl py-10 flex flex-col items-center justify-center text-center bg-surface-sunken">
              <p className="text-ink-muted">No media uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {media.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => openModal(index)}
                  className="relative w-full pb-[100%] rounded-2xl overflow-hidden bg-line-strong"
                >
                  {item.media_type === 'image' && (
                    <img
                      src={item.media_url}
                      className="absolute inset-0 w-full h-full object-cover"
                      alt=""
                    />
                  )}
                  {item.media_type === 'video' && (
                    <video
                      src={item.media_url}
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  {item.media_type === 'audio' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-fuchsia-100 text-indigo-900">
                      <span className="text-4xl">🎵</span>
                      <span className="mt-2 text-[11px] font-medium uppercase tracking-wide">Audio</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ABOUT TAB */}
      {activeTab === 'about' && (
        <section className="space-y-6">
          {/* About + links card */}
          <section className="rounded-3xl border border-line bg-surface shadow-[0_18px_48px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="px-5 py-6 space-y-6">
              {profile.bio && (
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-ink-strong">About</h2>
                  <p className="text-ink leading-relaxed">
                    {profile.bio}
                  </p>
                </div>
              )}

              {profile.links && Object.keys(profile.links).length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-ink-strong">Links</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(profile.links)
                      .filter(([, v]) => !!v)
                      .map(([key, value]) => (
                        <a
                          key={key}
                          href={value as string}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 rounded-full border border-line-strong text-sm text-ink hover:bg-surface-sunken"
                        >
                          {key}
                        </a>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Grid sections */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Left column */}
            <div className="space-y-4">
              {/* Achievements */}
              <section className="rounded-3xl border border-line bg-surface shadow-[0_18px_48px_rgba(15,23,42,0.04)] px-5 py-5">
                <h2 className="text-lg font-semibold mb-2 text-ink-strong">
                  Achievements
                </h2>
                {achievements.length === 0 ? (
                  <p className="text-ink-subtle">No achievements yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {achievements.map(a => (
                      <li
                        key={a.id}
                        className="rounded-2xl border border-line bg-surface-sunken px-3 py-3 space-y-1"
                      >
                        <div className="font-medium text-ink-strong">
                          {a.title}
                        </div>
                        {a.description && (
                          <div className="text-sm text-ink">
                            {a.description}
                          </div>
                        )}
                        {a.year && (
                          <div className="text-sm text-ink-subtle">{a.year}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Shows */}
              <section className="rounded-3xl border border-line bg-surface shadow-[0_18px_48px_rgba(15,23,42,0.04)] px-5 py-5">
                <h2 className="text-lg font-semibold mb-2 text-ink-strong">
                  Recent shows
                </h2>
                {shows.length === 0 ? (
                  <p className="text-ink-subtle">No shows yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {shows.map(s => (
                      <li
                        key={s.id}
                        className="rounded-2xl border border-line bg-surface-sunken px-3 py-3 space-y-1"
                      >
                        <div className="font-medium text-ink-strong">
                          {s.title}
                        </div>
                        <div className="text-sm text-ink">
                          {[s.venue, s.location].filter(Boolean).join(', ')}
                        </div>
                        {s.event_date && (
                          <div className="text-sm text-ink-subtle">
                            {new Date(s.event_date).toLocaleDateString()}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Skills */}
              <section className="rounded-3xl border border-line bg-surface shadow-[0_18px_48px_rgba(15,23,42,0.04)] px-5 py-5">
                <h2 className="text-lg font-semibold mb-2 text-ink-strong">Skills</h2>
                {skills.length === 0 ? (
                  <p className="text-ink-subtle">No skills yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {skills.map(sk => (
                      <li
                        key={sk.id}
                        className="rounded-2xl border border-line bg-surface-sunken px-3 py-3 flex justify-between items-center"
                      >
                        <span className="font-medium text-ink-strong">
                          {sk.skill}
                        </span>
                        <span className="text-sm italic text-ink-muted">
                          {sk.level}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Booking reviews */}
              <section className="rounded-3xl border border-line bg-surface shadow-[0_18px_48px_rgba(15,23,42,0.04)] px-5 py-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-ink-strong">
                    Reviews
                  </h2>
                  <RatingDisplay profileId={profile.id} variant="inline" />
                </div>
                <ReviewList profileId={profile.id} limit={5} />
              </section>

              {/* Recommendations */}
              <section className="rounded-3xl border border-line bg-surface shadow-[0_18px_48px_rgba(15,23,42,0.04)] px-5 py-5">
                <h2 className="text-lg font-semibold mb-2 text-ink-strong">
                  Recommendations
                </h2>
                {recommendations.length === 0 ? (
                  <p className=" text-ink-subtle">No recommendations yet.</p>
                ) : (
                  <div className="space-y-3">
                    {recommendations.map(r => (
                      <blockquote
                        key={r.id}
                        className="rounded-2xl border border-line bg-surface-sunken px-3 py-3"
                      >
                        <p className="italic text-ink-strong">
                          “{r.content}”
                        </p>
                        {r.author && (
                          <p className="text-xs mt-1 text-ink-subtle">— {r.author}</p>
                        )}
                      </blockquote>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </section>
      )}

      {/* MEDIA MODAL */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer"
            onClick={closeModal}
          />
          <div className="relative z-50 w-full max-w-3xl px-4">
            <button
              type="button"
              onClick={() => deleteMedia(selectedMedia)}
              className="absolute top-3 left-6 text-xs px-3 py-1 rounded-full bg-danger text-white shadow hover:bg-danger-700"
            >
              Delete
            </button>

            <button
              type="button"
              onClick={closeModal}
              className="absolute top-1 right-6 text-3xl font-bold text-white"
            >
              ×
            </button>

            {selectedMedia.media_type === 'image' && (
              <img
                src={selectedMedia.media_url}
                className="w-full max-h-[90vh] object-contain rounded-2xl"
                alt=""
              />
            )}
            {selectedMedia.media_type === 'video' && (
              <video
                src={selectedMedia.media_url}
                controls
                className="w-full max-h-[90vh] rounded-2xl"
              />
            )}
            {selectedMedia.media_type === 'audio' && (
              <div className="rounded-2xl bg-surface p-6">
                <AudioPlayer src={selectedMedia.media_url} title={selectedMedia.caption ?? 'Audio'} />
              </div>
            )}

            {media.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={showPrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-4xl text-white"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-4xl text-white"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* FOLLOWERS MODAL */}
      {showFollowersModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-surface rounded-3xl w-full max-w-md mx-auto max-h-[80vh] overflow-y-auto p-6 relative">
            <button
              className="absolute top-3 right-4 text-3xl font-bold text-ink-strong"
              onClick={() => setShowFollowersModal(false)}
            >
              ×
            </button>

            <h2 className="text-xl font-semibold mb-4 text-ink-strong">Followers</h2>

            {followersList.length === 0 ? (
              <p className="text-sm text-ink-subtle">No followers yet.</p>
            ) : (
              <ul className="space-y-4">
                {followersList.map(user => (
                  <li key={user.id}>
                    <Link
                      href={profilePath(user)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-line hover:bg-surface-sunken"
                    >
                      <img
                        src={user.avatar_url ?? '/default-avatar.png'}
                        className="w-12 h-12 rounded-full object-cover"
                        alt=""
                      />

                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink-strong">
                          {user.display_name}
                        </p>
                        <p className="text-xs text-ink-subtle">
                          @{(user as unknown as Record<string, string>).handle ??
                            user.display_name?.toLowerCase().replace(/\s+/g, '')}
                        </p>
                      </div>

                      <button
                        onClick={e => {
                          e.preventDefault();
                          toggleFollowFromModal(user.id);
                        }}
                        className={`px-3 py-1 text-xs rounded-lg border ${
                          myFollowingIds.includes(user.id)
                            ? 'bg-line-strong text-ink-strong'
                            : 'bg-black text-white'
                        }`}
                      >
                        {myFollowingIds.includes(user.id) ? 'Unfollow' : 'Follow'}
                      </button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* FOLLOWING MODAL */}
      {showFollowingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-surface rounded-3xl w-full max-w-md mx-auto max-h-[80vh] overflow-y-auto p-6 relative">
            <button
              className="absolute top-3 right-4 text-3xl font-bold text-ink-strong"
              onClick={() => setShowFollowingModal(false)}
            >
              ×
            </button>

            <h2 className="text-xl font-semibold mb-4 text-ink-strong">Following</h2>

            {followingList.length === 0 ? (
              <p className="text-sm text-ink-subtle">Not following anyone yet.</p>
            ) : (
              <ul className="space-y-4">
                {followingList.map(user => (
                  <li key={user.id}>
                    <Link
                      href={profilePath(user)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-line hover:bg-surface-sunken"
                    >
                      <img
                        src={user.avatar_url ?? '/default-avatar.png'}
                        className="w-12 h-12 rounded-full object-cover"
                        alt=""
                      />

                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink-strong">
                          {user.display_name}
                        </p>
                        <p className="text-xs text-ink-subtle">
                          @{(user as unknown as Record<string, string>).handle ??
                            user.display_name?.toLowerCase().replace(/\s+/g, '')}
                        </p>
                      </div>

                      <button
                        onClick={e => {
                          e.preventDefault();
                          toggleFollowFromModal(user.id);
                        }}
                        className={`px-3 py-1 text-xs rounded-lg border ${
                          myFollowingIds.includes(user.id)
                            ? 'bg-line-strong text-ink-strong'
                            : 'bg-black text-white'
                        }`}
                      >
                        {myFollowingIds.includes(user.id) ? 'Unfollow' : 'Follow'}
                      </button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
