'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';

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
  media_type: 'image' | 'video';
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
      <main className="mx-auto max-w-3xl px-4 pt-10 pb-20 text-red-600">
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

      const mediaType = file.type.startsWith('video') ? 'video' : 'image';

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
        .select('id', { count: 'exact', head: true })
        .eq('following_id', userId),
      supa
        .from('followers')
        .select('id', { count: 'exact', head: true })
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
      {/* HEADER CARD (clean white hero) */}
      <section className="rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.06)] p-6 sm:p-7 space-y-6">
        {/* Top row: Avatar + Details */}
        <div className="flex items-start gap-6">
          <img
            src={profile.avatar_url ?? '/placeholder-avatar.png'}
            className="w-24 h-24 rounded-full object-cover border border-neutral-300"
            alt="Profile avatar"
          />

          <div className="flex-1 space-y-1">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900">
              {profile.display_name ?? 'Unnamed artist'}
            </h1>

            <p className="text-sm text-neutral-500">@{username}</p>

            {profile.location && (
              <p className="text-sm text-neutral-600">{profile.location}</p>
            )}

            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {genres.map(g => (
                  <span
                    key={g}
                    className="px-3 py-1 rounded-full bg-neutral-100 text-sm text-neutral-700"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {profile.bio && (
              <p className="text-neutral-700 leading-snug pt-1">
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex justify-evenly text-center mt-2">
          <div>
            <p className="text-lg font-semibold text-neutral-900">{counts.posts}</p>
            <p className="text-[11px] text-neutral-600">Posts</p>
          </div>

          <button
            onClick={loadFollowers}
            className="flex flex-col items-center hover:text-neutral-900"
          >
            <p className="text-lg font-semibold text-neutral-900">
              {counts.followers}
            </p>
            <p className="text-[11px] text-neutral-600">Followers</p>
          </button>

          <button
            onClick={loadFollowing}
            className="flex flex-col items-center hover:text-neutral-900"
          >
            <p className="text-lg font-semibold text-neutral-900">
              {counts.following}
            </p>
            <p className="text-[11px] text-neutral-600">Following</p>
          </button>
        </div>

        {/* Buttons row */}
        <div className="flex flex-wrap gap-2 justify-center mt-2">
          <Link
            href="/profile/edit"
            className="px-4 py-1.5 rounded-xl border border-neutral-300 font-medium hover:bg-neutral-50"
          >
            Edit Profile
          </Link>

          <Link
            href="/gigs"
            className="px-4 py-1.5 rounded-xl border border-neutral-300 font-medium hover:bg-neutral-50"
          >
            My Gigs
          </Link>

          <button
            onClick={handleShare}
            className="px-4 py-1.5 rounded-xl border border-neutral-300 font-medium hover:bg-neutral-50"
          >
            Share
          </button>
        </div>

        {/* Quote */}
        {profile.quote && (
          <div className="px-4 py-3 rounded-xl bg-neutral-50 mt-3">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">
              Artist Quote
            </p>
            <p className="mt-1 italic text-neutral-800">
              “{profile.quote}”
            </p>
          </div>
        )}
      </section>

      {/* TABS (Instagram-style, text-only) */}
      <div className="border-b border-neutral-200">
        <div className="flex justify-center gap-10">
          {(['media', 'about'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative pb-3 font-medium ${
                activeTab === tab
                  ? 'text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {tab === 'media' ? 'Media' : 'About'}
              {activeTab === tab && (
                <span className="absolute left-0 right-0 -bottom-0.5 mx-auto h-[2px] w-8 rounded-full bg-neutral-900" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* MEDIA TAB */}
      {activeTab === 'media' && (
        <section className="rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.04)] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
                Media
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                Add photos and videos from your performances.
              </p>
            </div>

            <label className="cursor-pointer inline-flex items-center px-3 py-1.5 rounded-full border border-neutral-300 text-sm font-medium hover:bg-neutral-50">
              {uploading ? 'Uploading…' : 'Upload'}
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          </div>

          {media.length === 0 ? (
            <div className="border border-dashed border-neutral-300 rounded-2xl py-10 flex flex-col items-center justify-center text-center bg-neutral-50">
              <p className="text-neutral-600">No media uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {media.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => openModal(index)}
                  className="relative w-full pb-[100%] rounded-2xl overflow-hidden bg-neutral-200"
                >
                  {item.media_type === 'image' ? (
                    <img
                      src={item.media_url}
                      className="absolute inset-0 w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <video
                      src={item.media_url}
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                    />
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
          <section className="rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="px-5 py-6 space-y-6">
              {profile.bio && (
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-neutral-900">About</h2>
                  <p className="text-neutral-700 leading-relaxed">
                    {profile.bio}
                  </p>
                </div>
              )}

              {profile.links && Object.keys(profile.links).length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-neutral-800">Links</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(profile.links)
                      .filter(([, v]) => !!v)
                      .map(([key, value]) => (
                        <a
                          key={key}
                          href={value as string}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 rounded-full border border-neutral-300 text-sm text-neutral-700 hover:bg-neutral-50"
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
              <section className="rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.04)] px-5 py-5">
                <h2 className="text-lg font-semibold mb-2 text-neutral-900">
                  Achievements
                </h2>
                {achievements.length === 0 ? (
                  <p className="text-neutral-500">No achievements yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {achievements.map(a => (
                      <li
                        key={a.id}
                        className="rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-3 space-y-1"
                      >
                        <div className="font-medium text-neutral-900">
                          {a.title}
                        </div>
                        {a.description && (
                          <div className="text-sm text-neutral-700">
                            {a.description}
                          </div>
                        )}
                        {a.year && (
                          <div className="text-sm text-neutral-500">{a.year}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Shows */}
              <section className="rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.04)] px-5 py-5">
                <h2 className="text-lg font-semibold mb-2 text-neutral-900">
                  Recent shows
                </h2>
                {shows.length === 0 ? (
                  <p className="text-neutral-500">No shows yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {shows.map(s => (
                      <li
                        key={s.id}
                        className="rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-3 space-y-1"
                      >
                        <div className="font-medium text-neutral-900">
                          {s.title}
                        </div>
                        <div className="text-sm text-neutral-700">
                          {[s.venue, s.location].filter(Boolean).join(', ')}
                        </div>
                        {s.event_date && (
                          <div className="text-sm text-neutral-500">
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
              <section className="rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.04)] px-5 py-5">
                <h2 className="text-lg font-semibold mb-2 text-neutral-900">Skills</h2>
                {skills.length === 0 ? (
                  <p className="text-neutral-500">No skills yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {skills.map(sk => (
                      <li
                        key={sk.id}
                        className="rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-3 flex justify-between items-center"
                      >
                        <span className="font-medium text-neutral-900">
                          {sk.skill}
                        </span>
                        <span className="text-sm italic text-neutral-600">
                          {sk.level}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Recommendations */}
              <section className="rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.04)] px-5 py-5">
                <h2 className="text-lg font-semibold mb-2 text-neutral-900">
                  Recommendations
                </h2>
                {recommendations.length === 0 ? (
                  <p className=" text-neutral-400">No recommendations yet.</p>
                ) : (
                  <div className="space-y-3">
                    {recommendations.map(r => (
                      <blockquote
                        key={r.id}
                        className="rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-3"
                      >
                        <p className="italic text-neutral-900">
                          “{r.content}”
                        </p>
                        {r.author && (
                          <p className="text-xs mt-1 text-neutral-500">— {r.author}</p>
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
              className="absolute top-3 left-6 text-xs px-3 py-1 rounded-full bg-red-600 text-white shadow hover:bg-red-700"
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

            {selectedMedia.media_type === 'image' ? (
              <img
                src={selectedMedia.media_url}
                className="w-full max-h-[90vh] object-contain rounded-2xl"
                alt=""
              />
            ) : (
              <video
                src={selectedMedia.media_url}
                controls
                className="w-full max-h-[90vh] rounded-2xl"
              />
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
          <div className="bg-white rounded-3xl w-full max-w-md mx-auto max-h-[80vh] overflow-y-auto p-6 relative">
            <button
              className="absolute top-3 right-4 text-3xl font-bold text-neutral-800"
              onClick={() => setShowFollowersModal(false)}
            >
              ×
            </button>

            <h2 className="text-xl font-semibold mb-4 text-neutral-900">Followers</h2>

            {followersList.length === 0 ? (
              <p className="text-sm text-neutral-500">No followers yet.</p>
            ) : (
              <ul className="space-y-4">
                {followersList.map(user => (
                  <li key={user.id}>
                    <Link
                      href={profilePath(user)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50"
                    >
                      <img
                        src={user.avatar_url ?? '/default-avatar.png'}
                        className="w-12 h-12 rounded-full object-cover"
                        alt=""
                      />

                      <div className="flex-1">
                        <p className="text-sm font-medium text-neutral-900">
                          {user.display_name}
                        </p>
                        <p className="text-xs text-neutral-500">
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
                            ? 'bg-neutral-200 text-neutral-800'
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
          <div className="bg-white rounded-3xl w-full max-w-md mx-auto max-h-[80vh] overflow-y-auto p-6 relative">
            <button
              className="absolute top-3 right-4 text-3xl font-bold text-neutral-800"
              onClick={() => setShowFollowingModal(false)}
            >
              ×
            </button>

            <h2 className="text-xl font-semibold mb-4 text-neutral-900">Following</h2>

            {followingList.length === 0 ? (
              <p className="text-sm text-neutral-500">Not following anyone yet.</p>
            ) : (
              <ul className="space-y-4">
                {followingList.map(user => (
                  <li key={user.id}>
                    <Link
                      href={profilePath(user)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50"
                    >
                      <img
                        src={user.avatar_url ?? '/default-avatar.png'}
                        className="w-12 h-12 rounded-full object-cover"
                        alt=""
                      />

                      <div className="flex-1">
                        <p className="text-sm font-medium text-neutral-900">
                          {user.display_name}
                        </p>
                        <p className="text-xs text-neutral-500">
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
                            ? 'bg-neutral-200 text-neutral-800'
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
