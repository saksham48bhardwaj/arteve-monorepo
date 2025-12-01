'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';

/* ----------------------------- Shared Types ----------------------------- */

type PostMedia = {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  kind: 'post' | 'bit';
  created_at: string;
};

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

type BaseProfile = {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  bio: string | null;
  genres: string[] | null;
  links: Record<string, string> | null;
  location: string | null;
  quote: string | null;
  role: string | null;
  venue_photos: string[] | null;
};

type OrganizerGig = {
  id: string;
  title: string | null;
  event_date: string | null;
  location: string | null;
  status: 'open' | 'booked' | 'closed' | string;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
};

async function fetchProfileCounts(userId: string) {
  const supa = supabase;

  const [postsRes, followersRes, followingRes] = await Promise.all([
    supa.from("posts").select("id", { count: "exact", head: true }).eq("profile_id", userId),

    supa.from("followers").select("id", { count: "exact", head: true }).eq("following_id", userId),

    supa.from("followers").select("id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);

  return {
    posts: postsRes.count || 0,
    followers: followersRes.count || 0,
    following: followingRes.count || 0,
  };
}

/* ---------------------------------------------------------------------- */
/*  PUBLIC PROFILE PAGE                                                   */
/* ---------------------------------------------------------------------- */

export default function PublicProfilePage() {
  const { handle } = useParams<{ handle: string }>();

  const [profile, setProfile] = useState<BaseProfile | null>(null);

  // musician data
  const [posts, setPosts] = useState<PostMedia[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  // organizer data
  const [organizerGigs, setOrganizerGigs] = useState<OrganizerGig[]>([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // media modal
  const [selectedMedia, setSelectedMedia] = useState<PostMedia | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // venue modal (only for organizers)
  const [venueModalUrl, setVenueModalUrl] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'media' | 'about'>('media');

  const [counts, setCounts] = useState({
    posts: 0,
    followers: 0,
    following: 0,
  });

  const [isFollowing, setIsFollowing] = useState(false);
  

  /* -------------------------------------------- */
  /*  LOAD DATA                                   */
  /* -------------------------------------------- */
  useEffect(() => {
    if (!handle) return;
    (async () => {
      try {
        // 1) PROFILE
        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('handle', handle)
          .maybeSingle();

        if (pErr) throw pErr;
        if (!p) throw new Error('Profile not found');
        const prof = p as BaseProfile;
        setProfile(prof);

        const c = await fetchProfileCounts(prof.id);
        setCounts(c);     

        // 2) ORGANIZER VIEW
        if (prof.role === 'organizer') {
          const { data: gigsData, error: gigsErr } = await supabase
            .from('gigs')
            .select('*')
            .eq('organizer_id', prof.id)
            .order('created_at', { ascending: false });

          if (gigsErr) throw gigsErr;

          setOrganizerGigs((gigsData ?? []) as OrganizerGig[]);
          return;
        }

        const { data: auth } = await supabase.auth.getUser();
        const currentUserId = auth.user?.id;

        // CHECK FOLLOWING STATUS
        const { data: followData } = await supabase
          .from("followers")
          .select("*")
          .eq("follower_id", currentUserId || "")
          .eq("following_id", prof.id)
          .maybeSingle();

        setIsFollowing(!!followData);

        // 3) MUSICIAN VIEW
        const [
          { data: postData },
          { data: a },
          { data: s },
          { data: sk },
          { data: r }
        ] = await Promise.all([
          supabase
            .from('posts')
            .select('id, media_url, media_type, caption, kind, created_at')
            .eq('profile_id', prof.id)
            .not('media_url', 'is', null)
            .order('created_at', { ascending: false }),

          supabase
            .from('achievements')
            .select('*')
            .eq('profile_id', prof.id)
            .order('created_at', { ascending: false }),

          supabase
            .from('shows')
            .select('*')
            .eq('profile_id', prof.id)
            .order('event_date', { ascending: false }),

          supabase
            .from('skills')
            .select('*')
            .eq('profile_id', prof.id)
            .order('created_at', { ascending: false }),

          supabase
            .from('recommendations')
            .select('*')
            .eq('profile_id', prof.id)
            .order('created_at', { ascending: false }),
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
    if (!auth.user) {
      alert("Please log in to follow artists.");
      return;
    }
    if (!profile) {
      console.error("Profile not loaded yet.");
      return;
    }

    if (isFollowing) {
      await supabase
        .from("followers")
        .delete()
        .eq("follower_id", auth.user.id)
        .eq("following_id", profile.id);

      setIsFollowing(false);
      setCounts(prev => ({ ...prev, followers: prev.followers - 1 }));
    } else {
      await supabase.from("followers").insert({
        follower_id: auth.user.id,
        following_id: profile.id
      });

      setIsFollowing(true);
      setCounts(prev => ({ ...prev, followers: prev.followers + 1 }));
    }
  }

  /* -------------------------------------------- */
  /*  ESC KEY CLOSE MODAL                         */
  /* -------------------------------------------- */
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedMedia(null);
        setVenueModalUrl(null);
      }
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  /* -------------------------------------------- */
  /*  BASIC STATES                                */
  /* -------------------------------------------- */
  if (loading) return <main className="p-6">Loading profile…</main>;
  if (err || !profile)
    return <main className="p-6 text-red-600">Error: {err}</main>;

  const isOrganizer = profile.role === 'organizer';

  /* ====================================================================== */
  /*                    ORGANIZER PROFILE PAGE                               */
  /* ====================================================================== */
  if (isOrganizer) {
    const venuePhotos = profile.venue_photos ?? [];
    const primaryVenuePhoto = venuePhotos[0] ?? null;

    return (
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8 bg-white">

        {/* HEADER / HERO */}
        <section className="rounded-3xl border shadow-sm overflow-hidden bg-white">

          <div className="h-48 md:h-64 w-full bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 relative">
            {primaryVenuePhoto && (
              <img
                src={primaryVenuePhoto}
                alt="Venue photo"
                className="w-full h-full object-cover opacity-70"
              />
            )}
            <div className="absolute inset-0 bg-black/40" />

            <div className="absolute bottom-5 left-5 md:bottom-8 md:left-10 text-white space-y-1">
              <h1 className="text-3xl md:text-4xl font-semibold">
                {profile.display_name}
              </h1>
              {profile.location && (
                <div className="flex justify-center md:justify-start gap-6 mt-3 text-center">
                  <div>
                    <p className="text-lg font-semibold">{counts.posts}</p>
                    <p className="text-xs text-gray-600">Posts</p>
                  </div>

                  <div>
                    <p className="text-lg font-semibold">{counts.followers}</p>
                    <p className="text-xs text-gray-600">Followers</p>
                  </div>

                  <div>
                    <p className="text-lg font-semibold">{counts.following}</p>
                    <p className="text-xs text-gray-600">Following</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* BIO + LINKS */}
          <div className="px-6 py-6 md:px-10 md:py-8 space-y-4">
            {profile.bio && (
              <p className="text-sm md:text-base text-gray-800 whitespace-pre-line">
                {profile.bio}
              </p>
            )}

            {profile.links && Object.keys(profile.links).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">Online presence</h3>
                <div className="flex flex-wrap gap-3 text-xs md:text-sm">
                  {Object.entries(profile.links)
                    .filter(([, v]) => v)
                    .map(([key, value]) => (
                      <a
                        key={key}
                        href={value as string}
                        target="_blank"
                        className="px-3 py-1 rounded-full border hover:bg-gray-50"
                      >
                        {key}
                      </a>
                    ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* VENUE PHOTOS */}
        <section className="rounded-3xl border shadow-sm px-6 py-6 space-y-4 bg-white">
          <h2 className="text-lg md:text-xl font-semibold">Venue photos</h2>

          {venuePhotos.length === 0 ? (
            <p className="text-sm text-gray-500">No venue photos available.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {venuePhotos.map((url) => (
                <button
                  key={url}
                  onClick={() => setVenueModalUrl(url)}
                  className="relative w-full pb-[75%] bg-gray-200 rounded-2xl overflow-hidden"
                >
                  <img
                    src={url}
                    className="absolute inset-0 object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ORGANIZER GIGS */}
        <section className="rounded-3xl border shadow-sm px-6 py-6 bg-white space-y-4">
          <h2 className="text-lg md:text-xl font-semibold">Gigs by this organizer</h2>

          {organizerGigs.length === 0 ? (
            <p className="text-sm text-gray-500">No gigs posted yet.</p>
          ) : (
            <div className="space-y-3">
              {organizerGigs.map((gig) => (
                <Link
                  key={gig.id}
                  href={`/gigs/${gig.id}`}
                  className="block border rounded-2xl p-4 hover:bg-gray-50"
                >
                  <p className="font-medium">{gig.title}</p>
                  <p className="text-xs text-gray-500">
                    {gig.event_date
                      ? new Date(gig.event_date).toLocaleDateString()
                      : 'Date TBD'}
                    {gig.location ? ` • ${gig.location}` : ''}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* MODAL */}
        {venueModalUrl && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <button onClick={() => setVenueModalUrl(null)} className="absolute inset-0" />
            <div className="relative max-w-3xl px-4">
              <img src={venueModalUrl} className="rounded-2xl max-h-[90vh]" />
              <button
                className="absolute top-2 right-4 text-white text-3xl"
                onClick={() => setVenueModalUrl(null)}
              >
                ×
              </button>
            </div>
          </div>
        )}
      </main>
    );
  }

  /* ====================================================================== */
  /*                    MUSICIAN PROFILE PAGE                                */
  /* ====================================================================== */

  const primaryMedia = posts[0];
  const genres = Array.isArray(profile.genres) ? profile.genres : [];
  const username =profile.handle;

  function openModal(i: number) {
    setSelectedIndex(i);
    setSelectedMedia(posts[i]);
  }
  function closeModal() {
    setSelectedMedia(null);
  }
  function showNext() {
    const next = (selectedIndex + 1) % posts.length;
    setSelectedIndex(next);
    setSelectedMedia(posts[next]);
  }
  function showPrev() {
    const prev = (selectedIndex - 1 + posts.length) % posts.length;
    setSelectedIndex(prev);
    setSelectedMedia(posts[prev]);
  }

/* ====================================================================== */
/*                    MUSICIAN PUBLIC PROFILE UI (FINAL)                  */
/* ====================================================================== */

return (
  <main className="w-full max-w-xl mx-auto px-4 py-6 space-y-6">

    {/* HEADER CARD */}
    <section className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm p-6 space-y-6">

      {/* Top Row: Avatar + Details */}
      <div className="flex items-start gap-6">

        {/* Avatar */}
        <img
          src={profile.avatar_url ?? '/placeholder-avatar.png'}
          className="w-24 h-24 rounded-full object-cover border border-neutral-300 dark:border-neutral-700"
        />

        {/* Main Profile Info */}
        <div className="flex-1 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">{profile.display_name}</h1>

          <p className="text-xs text-neutral-500 dark:text-neutral-400">@{username}</p>

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
            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-snug pt-1 whitespace-pre-line">
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-around text-center mt-2">
        <div>
          <p className="text-lg font-semibold">{counts.posts}</p>
          <p className="text-[11px] text-neutral-600 dark:text-neutral-400">Posts</p>
        </div>

        <div>
          <p className="text-lg font-semibold">{counts.followers}</p>
          <p className="text-[11px] text-neutral-600 dark:text-neutral-400">Followers</p>
        </div>

        <div>
          <p className="text-lg font-semibold">{counts.following}</p>
          <p className="text-[11px] text-neutral-600 dark:text-neutral-400">Following</p>
        </div>
      </div>

      {/* PUBLIC ACTION BUTTONS */}
      <div className="flex gap-2 justify-center mt-1">

        {/* Follow / Unfollow */}
        <button
          onClick={toggleFollow}
          className="px-4 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm font-medium"
        >
          {isFollowing ? "Unfollow" : "Follow"}
        </button>

        {/* Message */}
        <Link
          href={`/chat/${profile.id}`}
          className="px-4 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm font-medium"
        >
          Message
        </Link>

        {/* Book */}
        <Link
          href={`/book/${profile.id}`}
          className="px-4 py-1.5 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-medium"
        >
          Book
        </Link>

        {/* Share */}
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
        {posts.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-10">
            No media uploaded yet.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {posts.map((item, i) => (
              <button
                key={item.id}
                onClick={() => openModal(i)}
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

        {/* Banner + About + Links */}
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
              <div>
                <h2 className="text-lg font-semibold">About</h2>
                <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-line">
                  {profile.bio}
                </p>
              </div>
            )}

            {profile.links && Object.keys(profile.links).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Links
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(profile.links)
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <a
                        key={k}
                        href={v as string}
                        target="_blank"
                        className="px-3 py-1 rounded-full border border-neutral-300 dark:border-neutral-700 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-900"
                      >
                        {k}
                      </a>
                    ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Achievements / Shows / Skills / Recommendations Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          
          {/* Achievements */}
          <section className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm px-5 py-5">
            <h2 className="text-lg font-semibold mb-2">Achievements</h2>
            {achievements.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No achievements yet.</p>
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
                      <p className="text-xs text-neutral-700 dark:text-neutral-300">
                        {a.description}
                      </p>
                    )}
                    {a.year && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {a.year}
                      </p>
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
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No shows yet.</p>
            ) : (
              <ul className="space-y-2">
                {shows.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-3 py-3 space-y-1"
                  >
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                      {s.title}
                    </p>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300">
                      {[s.venue, s.location].filter(Boolean).join(', ')}
                    </p>
                    {s.event_date && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {new Date(s.event_date).toLocaleDateString()}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Skills */}
          <section className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm px-5 py-5">
            <h2 className="text-lg font-semibold mb-2">Skills</h2>
            {skills.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No skills yet.</p>
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
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No recommendations yet.</p>
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
      </section>
    )}

    {/* MEDIA MODAL */}
    {selectedMedia && (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
        <button className="absolute inset-0" onClick={closeModal} />
        <div className="relative max-w-2xl w-full px-4">
          <button
            onClick={closeModal}
            className="absolute top-2 right-3 text-white text-3xl font-bold"
          >
            ×
          </button>

          {selectedMedia.media_type === 'image' ? (
            <img src={selectedMedia.media_url} className="w-full rounded-2xl" />
          ) : (
            <video src={selectedMedia.media_url} controls className="w-full rounded-2xl" />
          )}

          {posts.length > 1 && (
            <>
              <button
                onClick={showPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white text-4xl"
              >
                ‹
              </button>
              <button
                onClick={showNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white text-4xl"
              >
                ›
              </button>
            </>
          )}
        </div>
      </div>
    )}
  </main>
);
}
