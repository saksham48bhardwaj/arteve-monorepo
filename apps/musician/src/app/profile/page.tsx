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
  console.log("DELETE DEBUG – publicUrl:", publicUrl);

  const marker = '/storage/v1/object/public/media/';
  const index = publicUrl.indexOf(marker);
  if (index === -1) {
    console.log("DELETE DEBUG – marker not found!");
    return null;
  }

  const path = publicUrl.substring(index + marker.length);

  console.log("DELETE DEBUG – extracted path:", path);
  return path;
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

  // Followers & Following modal
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
        // PROFILE
        const { data: p } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setProfile(p as Profile);

        // Load counts for posts, followers, following
        const c = await fetchProfileCounts(user.id);
        setCounts(c);

        // Load IDs I am following
        const { data: myFollows } = await supabase
          .from("followers")
          .select("following_id")
          .eq("follower_id", user.id);

        setMyFollowingIds(myFollows?.map((f) => f.following_id) ?? []);

        // ACHIEVEMENTS
        const { data: a } = await supabase
          .from('achievements')
          .select('*')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false });
        setAchievements((a ?? []) as Achievement[]);

        // SHOWS
        const { data: s } = await supabase
          .from('shows')
          .select('*')
          .eq('profile_id', user.id)
          .order('event_date', { ascending: false });
        setShows((s ?? []) as Show[]);

        // SKILLS
        const { data: sk } = await supabase
          .from('skills')
          .select('*')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false });
        setSkills((sk ?? []) as Skill[]);

        // MEDIA POSTS
        const { data: posts } = await supabase
          .from('posts')
          .select('id, media_url, media_type, caption, kind, created_at')
          .eq('profile_id', user.id)
          .in('kind', ['post', 'bit']) 
          .not('media_url', 'is', null)
          .order('created_at', { ascending: false });

        setMedia((posts ?? []) as PostMedia[]);

        // RECOMMENDATIONS
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

  if (loading) return <main className="p-6">Loading…</main>;
  if (err) return <main className="p-6 text-red-600">{err}</main>;
  if (!profile) return <main className="p-6">No profile found.</main>;

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

      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      const mediaType = file.type.startsWith('video') ? 'video' : 'image';

      // Insert DB row
      await supabase.from('posts').insert({
        profile_id: profile.id,
        media_url: urlData.publicUrl,
        media_type: mediaType,
        kind: 'post',
      });

      // Reload media
      const { data: posts } = await supabase
        .from('posts')
        .select('id, media_url, media_type, caption, kind, created_at')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });

      setMedia(posts ?? []);
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
      supa
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", userId),

      supa
        .from("followers")
        .select("id", { count: "exact", head: true })
        .eq("following_id", userId),

      supa
        .from("followers")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", userId),
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
    console.log("DELETE CLICKED!", item);

    if (!item.media_url) {
      console.log("No media URL");
      return;
    }

    const storagePath = extractStoragePath(item.media_url);

    console.log("STORAGE PATH RESULT:", storagePath);

    if (!storagePath) {
      console.log("❌ Could not extract storage path");
      return;
    }

    const { error: removeErr } = await supabase.storage
      .from('media')
      .remove([storagePath]);

    console.log("REMOVE RESULT:", removeErr);

    await supabase.from('posts').delete().eq('id', item.id);
    console.log("DB DELETE DONE");

    setMedia(prev => prev.filter(m => m.id !== item.id));

    closeModal();
  }

  /* ---------------------------- Load Followers ---------------------------- */
  async function loadFollowers() {
    if (!profile) return;

    const { data, error } = await supabase
      .from("followers")
      .select("follower_id, profiles:follower_id(*)") as unknown as {
        data: FollowerRow[] | null;
        error: Error | null;
      };

    if (!error && data) {
      setFollowersList(
        data
          .map((row) => row.profiles)
          .filter((p): p is Profile => p !== null)
      );
    }

    setShowFollowersModal(true);
  }

  async function toggleFollowFromModal(targetId: string) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return alert("Login required.");

    const me = auth.user.id;

    // Already following → unfollow
    if (myFollowingIds.includes(targetId)) {
      await supabase
        .from("followers")
        .delete()
        .eq("follower_id", me)
        .eq("following_id", targetId);

      setMyFollowingIds((prev) => prev.filter((id) => id !== targetId));
    } 
    else {
      // Not following → follow
      await supabase.from("followers").insert({
        follower_id: me,
        following_id: targetId,
      });

      setMyFollowingIds((prev) => [...prev, targetId]);
    }

    // Update visible UI inside modal too
    setCounts((c) => ({
      ...c,
      following: myFollowingIds.includes(targetId)
        ? c.following - 1
        : c.following + 1,
    }));
  }

  /* ---------------------------- Load Following ---------------------------- */
  async function loadFollowing() {
    if (!profile) return;

    const { data, error } = await supabase
      .from("followers")
      .select("following_id, profiles:following_id(*)") as unknown as {
        data: FollowingRow[] | null;
        error: Error | null;
      };

    if (!error && data) {
      setFollowingList(
        data
          .map((row) => row.profiles)
          .filter((p): p is Profile => p !== null)
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

  const username =
    profile.display_name?.trim().toLowerCase().replace(/\s+/g, '') ??
    profile.id.slice(0, 8);

  const primaryMedia = media.at(0) ?? null;
  const genres = profile.genres ?? [];

  /* ---------------------------------------------------------
      UI STARTS HERE
  --------------------------------------------------------- */
    /* ---------------------------------------------------------
      UI STARTS HERE
  --------------------------------------------------------- */
  return (
    <main className="w-full max-w-xl mx-auto px-4 py-6 space-y-6">

      {/* HEADER CARD */}
      <section className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm p-6 space-y-6">
        {/* Avatar + main info */}
         {/* Top row: Avatar + Details */}
  <div className="flex items-start gap-6">

    {/* Avatar */}
    <img
      src={profile.avatar_url ?? '/placeholder-avatar.png'}
      className="w-24 h-24 rounded-full object-cover border border-neutral-300 dark:border-neutral-700"
    />

    {/* Name, username, location, genres */}
    <div className="flex-1 space-y-1">
      <h1 className="text-xl font-semibold tracking-tight">
        {profile.display_name ?? 'Unnamed artist'}
      </h1>

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        @{username}
      </p>

      {profile.location && (
        <p className="text-xs text-neutral-600 dark:text-neutral-300">
          {profile.location}
        </p>
      )}

      {genres.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {genres.map((g) => (
            <span
              key={g}
              className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900 text-xs text-neutral-700 dark:text-neutral-300"
            >
              {g}
            </span>
          ))}
        </div>
      )}

      {profile.bio && (
        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-snug pt-1">
          {profile.bio}
        </p>
      )}
    </div>
  </div>

  {/* Stats row */}
  <div className="flex justify-around text-center mt-2">

    <div>
      <p className="text-lg font-semibold">{counts.posts}</p>
      <p className="text-[11px] text-neutral-600 dark:text-neutral-400">Posts</p>
    </div>

    <button onClick={loadFollowers} className="flex flex-col items-center">
      <p className="text-lg font-semibold">{counts.followers}</p>
      <p className="text-[11px] text-neutral-600 dark:text-neutral-400">Followers</p>
    </button>

    <button onClick={loadFollowing} className="flex flex-col items-center">
      <p className="text-lg font-semibold">{counts.following}</p>
      <p className="text-[11px] text-neutral-600 dark:text-neutral-400">Following</p>
    </button>


  </div>

  {/* Buttons row */}
  <div className="flex gap-2 justify-center mt-1">

    <Link
      href="/profile/edit"
      className="px-4 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm font-medium"
    >
      Edit Profile
    </Link>

    <Link
      href="/bookings"
      className="px-4 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm font-medium"
    >
      View Bookings
    </Link>

    <button
      onClick={() =>
        navigator.clipboard.writeText(`${window.location.origin}/profile/${profile.id}`)
      }
      className="px-4 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm font-medium"
    >
      Share
    </button>

  </div>

  {/* Quote */}
  {profile.quote && (
    <div className="px-4 py-3 rounded-xl bg-neutral-100 dark:bg-neutral-900 mt-3">
      <p className="text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Artist Quote
      </p>
      <p className="mt-1 text-sm italic text-neutral-700 dark:text-neutral-200">
        “{profile.quote}”
      </p>
    </div>
  )}
      </section>

      {/* TABS */}
      <div className="flex gap-6 border-b border-neutral-200 dark:border-neutral-800 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('media')}
          className={`pb-2 text-sm font-medium ${
            activeTab === 'media'
              ? 'border-b-2 border-black dark:border-white text-black dark:text-white'
              : 'text-neutral-500 dark:text-neutral-400'
          }`}
        >
          Media
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('about')}
          className={`pb-2 text-sm font-medium ${
            activeTab === 'about'
              ? 'border-b-2 border-black dark:border-white text-black dark:text-white'
              : 'text-neutral-500 dark:text-neutral-400'
          }`}
        >
          About
        </button>
      </div>

      {/* MEDIA TAB */}
      {activeTab === 'media' && (
        <section className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Media</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Add photos and videos from your performances.
              </p>
            </div>

            <label className="cursor-pointer inline-flex items-center px-3 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900">
              {uploading ? 'Uploading…' : 'Upload'}
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          </div>

          {/* Grid */}
          {media.length === 0 ? (
            <div className="border border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl py-10 flex flex-col items-center justify-center text-center bg-neutral-50 dark:bg-neutral-900">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                No media uploaded yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {media.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => openModal(index)}
                  className="relative w-full pb-[100%] rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800"
                >
                  {item.media_type === 'image' ? (
                    <img
                      src={item.media_url}
                      className="absolute inset-0 w-full h-full object-cover"
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
          {/* Banner + bio + links */}
          <section className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm overflow-hidden">
            <div className="h-40 w-full relative bg-neutral-900">
              {primaryMedia?.media_type === 'image' && (
                <img
                  src={primaryMedia.media_url}
                  className="w-full h-full object-cover opacity-60"
                />
              )}
              <div className="absolute inset-0 bg-black/30" />
            </div>

            <div className="px-5 py-6 space-y-6">
              {profile.bio && (
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">About</h2>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    {profile.bio}
                  </p>
                </div>
              )}

              {profile.links && Object.keys(profile.links).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    Links
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(profile.links)
                      .filter(([, v]) => !!v)
                      .map(([key, value]) => (
                        <a
                          key={key}
                          href={value as string}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 rounded-full border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900"
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
              <section className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm px-5 py-5">
                <h2 className="text-lg font-semibold mb-2">Achievements</h2>
                {achievements.length === 0 ? (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    No achievements yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {achievements.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-3 py-3 space-y-1"
                      >
                        <div className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                          {a.title}
                        </div>
                        {a.description && (
                          <div className="text-xs text-neutral-700 dark:text-neutral-300">
                            {a.description}
                          </div>
                        )}
                        {a.year && (
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {a.year}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Shows */}
              <section className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm px-5 py-5">
                <h2 className="text-lg font-semibold mb-2">Recent shows</h2>
                {shows.length === 0 ? (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    No shows yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {shows.map((s) => (
                      <li
                        key={s.id}
                        className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-3 py-3 space-y-1"
                      >
                        <div className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                          {s.title}
                        </div>
                        <div className="text-xs text-neutral-700 dark:text-neutral-300">
                          {[s.venue, s.location].filter(Boolean).join(', ')}
                        </div>
                        {s.event_date && (
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
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
              <section className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm px-5 py-5">
                <h2 className="text-lg font-semibold mb-2">Skills</h2>
                {skills.length === 0 ? (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    No skills yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {skills.map((sk) => (
                      <li
                        key={sk.id}
                        className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-3 py-3 flex justify-between items-center"
                      >
                        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                          {sk.skill}
                        </span>
                        <span className="text-xs italic text-neutral-600 dark:text-neutral-300">
                          {sk.level}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Recommendations */}
              <section className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm px-5 py-5">
                <h2 className="text-lg font-semibold mb-2">Recommendations</h2>
                {recommendations.length === 0 ? (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    No recommendations yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recommendations.map((r) => (
                      <blockquote
                        key={r.id}
                        className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-3 py-3"
                      >
                        <p className="text-sm italic text-neutral-800 dark:text-neutral-100">
                          “{r.content}”
                        </p>
                        {r.author && (
                          <p className="text-xs mt-1 text-neutral-500 dark:text-neutral-400">
                            — {r.author}
                          </p>
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
          {/* background click */}
          <button
            type="button"
            className="absolute inset-0 cursor-pointer"
            onClick={closeModal}
          />
          <div className="relative z-50 w-full max-w-3xl px-4">
            {/* DELETE */}
            <button
              type="button"
              onClick={() => deleteMedia(selectedMedia)}
              className="absolute top-3 left-6 text-xs px-3 py-1 rounded-full bg-red-600 text-white shadow hover:bg-red-700"
            >
              Delete
            </button>

            {/* CLOSE */}
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

      {showFollowersModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-md mx-auto max-h-[80vh] overflow-y-auto p-6 relative">

            <button
              className="absolute top-3 right-4 text-3xl font-bold text-neutral-800 dark:text-neutral-100"
              onClick={() => setShowFollowersModal(false)}
            >
              ×
            </button>

            <h2 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              Followers
            </h2>

            {followersList.length === 0 ? (
              <p className="text-sm text-neutral-500">No followers yet.</p>
            ) : (
              <ul className="space-y-4">
                {followersList.map((user) => (
                  <li key={user.id}>
                    <Link
                      href={profilePath(user)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    >
                      <img
                        src={user.avatar_url ?? '/default-avatar.png'}
                        className="w-12 h-12 rounded-full object-cover"
                      />

                      <div className="flex-1">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {user.display_name}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          @{(user as unknown as Record<string, string>).handle ??
                            user.display_name?.toLowerCase().replace(/\s+/g, '')}
                        </p>
                      </div>

                      {/* Follow Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault(); // Prevent link click
                          toggleFollowFromModal(user.id);
                        }}
                        className={`px-3 py-1 text-xs rounded-lg border ${
                          myFollowingIds.includes(user.id)
                            ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-white"
                            : "bg-black text-white dark:bg-white dark:text-black"
                        }`}
                      >
                        {myFollowingIds.includes(user.id) ? "Unfollow" : "Follow"}
                      </button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {showFollowingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-md mx-auto max-h-[80vh] overflow-y-auto p-6 relative">

            <button
              className="absolute top-3 right-4 text-3xl font-bold text-neutral-800 dark:text-neutral-100"
              onClick={() => setShowFollowingModal(false)}
            >
              ×
            </button>

            <h2 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              Following
            </h2>

            {followingList.length === 0 ? (
              <p className="text-sm text-neutral-500">Not following anyone yet.</p>
            ) : (
              <ul className="space-y-4">
                {followingList.map((user) => (
                  <li key={user.id}>
                    <Link
                      href={profilePath(user)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    >
                      <img
                        src={user.avatar_url ?? '/default-avatar.png'}
                        className="w-12 h-12 rounded-full object-cover"
                      />

                      <div className="flex-1">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {user.display_name}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          @{(user as unknown as Record<string, string>).handle ??
                            user.display_name?.toLowerCase().replace(/\s+/g, '')}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFollowFromModal(user.id);
                        }}
                        className={`px-3 py-1 text-xs rounded-lg border ${
                          myFollowingIds.includes(user.id)
                            ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-white"
                            : "bg-black text-white dark:bg-white dark:text-black"
                        }`}
                      >
                        {myFollowingIds.includes(user.id) ? "Unfollow" : "Follow"}
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

/* ---------------------------------------------------------
    STAT BLOCK
--------------------------------------------------------- */
function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/80 py-3">
      <div className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
        {value}
      </div>
      <div className="text-[11px] text-neutral-600 dark:text-neutral-400">
        {label}
      </div>
    </div>
  );
}

