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

type FollowerRow = {
  follower_id: string;
  profiles: BaseProfile | null;
};

type FollowingRow = {
  following_id: string;
  profiles: BaseProfile | null;
};

async function fetchProfileCounts(userId: string) {
  const supa = supabase;

  const [postsRes, followersRes, followingRes] = await Promise.all([
    supa
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', userId),
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

  // Followers & Following modal
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  const [followersList, setFollowersList] = useState<BaseProfile[]>([]);
  const [followingList, setFollowingList] = useState<BaseProfile[]>([]);
  const [myFollowingIds, setMyFollowingIds] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<'media' | 'about'>('media');

  const [counts, setCounts] = useState({
    posts: 0,
    followers: 0,
    following: 0,
  });

  const [isFollowing, setIsFollowing] = useState(false);

  function profilePath(user: BaseProfile) {
    return user.handle ? `/profile/${user.handle}` : `/profile/${user.id}`;
  }

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

        // Organizer public page (venues)
        if (prof.role === 'organizer') {
          const { data: gigsData, error: gigsErr } = await supabase
            .from('gigs')
            .select('*')
            .eq('organizer_id', prof.id)
            .order('created_at', { ascending: false });

          if (gigsErr) throw gigsErr;
          setOrganizerGigs((gigsData ?? []) as OrganizerGig[]);
          setLoading(false);
          return;
        }

        // 2) MUSICIAN VIEW
        const { data: auth } = await supabase.auth.getUser();
        const currentUserId = auth.user?.id;

        if (currentUserId) {
          const { data: myFollows } = await supabase
            .from('followers')
            .select('following_id')
            .eq('follower_id', currentUserId);

          setMyFollowingIds(myFollows?.map(f => f.following_id) ?? []);

          const { data: followData } = await supabase
            .from('followers')
            .select('*')
            .eq('follower_id', currentUserId)
            .eq('following_id', prof.id)
            .maybeSingle();

          setIsFollowing(!!followData);
        }

        const [
          { data: postData },
          { data: a },
          { data: s },
          { data: sk },
          { data: r },
        ] = await Promise.all([
          supabase
            .from('posts')
            .select(
              'id, media_url, media_type, caption, kind, created_at',
            )
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
  if (loading) {
    return (
      <main className="w-full mx-auto max-w-3xl px-4 sm:px-6 md:px-0 pt-10 pb-24">
        Loading profile…
      </main>
    );
  }

  if (err || !profile) {
    return (
      <main className="w-full mx-auto max-w-3xl px-4 sm:px-6 md:px-0 pt-10 pb-24 text-red-600">
        Error: {err}
      </main>
    );
  }

  const isOrganizer = profile.role === 'organizer';

  /* ====================================================================== */
  /*                    ORGANIZER PROFILE PAGE (VENUE)                      */
  /* ====================================================================== */

  if (isOrganizer) {
    const venuePhotos = profile.venue_photos ?? [];
    const primaryVenuePhoto = venuePhotos[0] ?? null;

    return (
      <main className="w-full mx-auto max-w-3xl px-4 sm:px-6 md:px-0 pt-10 pb-24 space-y-8">
        {/* HEADER / HERO CARD */}
        <section className="rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.06)] overflow-hidden">
          <div className="h-48 md:h-64 w-full relative bg-neutral-800">
            {primaryVenuePhoto && (
              <img
                src={primaryVenuePhoto}
                alt="Venue"
                className="w-full h-full object-cover opacity-70"
              />
            )}
            <div className="absolute inset-0 bg-black/35" />
            <div className="absolute bottom-6 left-6 right-6 md:left-10 md:right-10 flex flex-col gap-3">
              <h1 className="text-2xl md:text-3xl font-semibold text-white">
                {profile.display_name}
              </h1>
              {profile.location && (
                <p className="text-[13px] text-neutral-200">
                  {profile.location}
                </p>
              )}
              <div className="flex gap-8 mt-1">
                <StatPill label="Posts" value={counts.posts} inverse />
                <StatPill label="Followers" value={counts.followers} inverse />
                <StatPill label="Following" value={counts.following} inverse />
              </div>
            </div>
          </div>

          <div className="px-6 py-6 md:px-8 md:py-7 space-y-4">
            {profile.bio && (
              <p className="text-[15px] leading-relaxed text-neutral-800 whitespace-pre-line">
                {profile.bio}
              </p>
            )}

            {profile.links && Object.keys(profile.links).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[15px] font-semibold text-neutral-900">
                  Online presence
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
                        className="px-3 py-1 rounded-full border border-neutral-300 text-[13px] text-neutral-800 hover:bg-neutral-50"
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
        <section className="rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.04)] px-6 py-6 space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            Venue photos
          </h2>
          {venuePhotos.length === 0 ? (
            <p className="text-[13px] text-neutral-500">
              No venue photos available.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {venuePhotos.map(url => (
                <button
                  key={url}
                  onClick={() => setVenueModalUrl(url)}
                  className="relative w-full pb-[75%] rounded-2xl overflow-hidden bg-neutral-200"
                >
                  <img
                    src={url}
                    className="absolute inset-0 w-full h-full object-cover"
                    alt=""
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ORGANIZER GIGS */}
        <section className="rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.04)] px-6 py-6 space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            Gigs by this organizer
          </h2>
          {organizerGigs.length === 0 ? (
            <p className="text-[13px] text-neutral-500">
              No gigs posted yet.
            </p>
          ) : (
            <div className="space-y-3">
              {organizerGigs.map(gig => (
                <Link
                  key={gig.id}
                  href={`/gigs/${gig.id}`}
                  className="block rounded-2xl border border-neutral-200 px-4 py-3 hover:bg-neutral-50"
                >
                  <p className="font-medium text-neutral-900">
                    {gig.title || 'Untitled gig'}
                  </p>
                  <p className="text-[13px] text-neutral-600">
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

        {/* VENUE PHOTO MODAL */}
        {venueModalUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <button
              className="absolute inset-0"
              onClick={() => setVenueModalUrl(null)}
            />
            <div className="relative max-w-3xl w-full px-4">
              <img
                src={venueModalUrl}
                className="rounded-2xl max-h-[90vh] w-full object-contain"
                alt=""
              />
              <button
                className="absolute top-2 right-4 text-3xl font-bold text-white"
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
  const username = profile.handle;

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

  async function toggleFollow() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      alert('Please log in to follow artists.');
      return;
    }
    if (!profile) return;

    if (isFollowing) {
      await supabase
        .from('followers')
        .delete()
        .eq('follower_id', auth.user.id)
        .eq('following_id', profile.id);

      setIsFollowing(false);
      setCounts(prev => ({ ...prev, followers: prev.followers - 1 }));
    } else {
      await supabase.from('followers').insert({
        follower_id: auth.user.id,
        following_id: profile.id,
      });

      setIsFollowing(true);
      setCounts(prev => ({ ...prev, followers: prev.followers + 1 }));
    }
  }

  async function toggleFollowFromModal(targetId: string) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      alert('Please log in to follow artists.');
      return;
    }

    const me = auth.user.id;
    const alreadyFollowing = myFollowingIds.includes(targetId);

    if (alreadyFollowing) {
      await supabase
        .from('followers')
        .delete()
        .eq('follower_id', me)
        .eq('following_id', targetId);

      setMyFollowingIds(prev => prev.filter(id => id !== targetId));
    } else {
      await supabase.from('followers').insert({
        follower_id: me,
        following_id: targetId,
      });

      setMyFollowingIds(prev => [...prev, targetId]);
    }
  }

  async function loadFollowers() {
    if (!profile) return;

    const { data, error } = (await supabase
      .from('followers')
      .select('follower_id, profiles:follower_id(*)')
      .eq('following_id', profile.id)) as unknown as {
      data: FollowerRow[] | null;
      error: Error | null;
    };

    if (!error && data) {
      setFollowersList(
        data.map(row => row.profiles).filter((p): p is BaseProfile => p !== null),
      );
    }

    setShowFollowersModal(true);
  }

  async function loadFollowing() {
    if (!profile) return;

    const { data, error } = (await supabase
      .from('followers')
      .select('following_id, profiles:following_id(*)')
      .eq('follower_id', profile.id)) as unknown as {
      data: FollowingRow[] | null;
      error: Error | null;
    };

    if (!error && data) {
      setFollowingList(
        data.map(row => row.profiles).filter((p): p is BaseProfile => p !== null),
      );
    }

    setShowFollowingModal(true);
  }

  /* ====================================================================== */
  /*                    MUSICIAN PUBLIC PROFILE UI                          */
  /* ====================================================================== */

  return (
    <main className="w-full mx-auto max-w-3xl px-4 sm:px-6 md:px-0 pt-10 pb-24 space-y-8">
      {/* HEADER CARD */}
      <section className="rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.06)] p-6 sm:p-7 space-y-6">
        {/* Top Row */}
        <div className="flex items-start gap-6">
          <img
            src={profile.avatar_url ?? '/placeholder-avatar.png'}
            className="w-24 h-24 rounded-full object-cover border border-neutral-300"
            alt="Profile avatar"
          />

          <div className="flex-1 space-y-1">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900">
              {profile.display_name}
            </h1>

            <p className="text-[13px] text-neutral-500">@{username}</p>

            {profile.location && (
              <p className="text-[13px] text-neutral-600">
                {profile.location}
              </p>
            )}

            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {genres.map(g => (
                  <span
                    key={g}
                    className="px-3 py-1 rounded-full bg-neutral-100 text-[13px] text-neutral-700"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {profile.bio && (
              <p className="text-neutral-700 leading-snug pt-1 whitespace-pre-line">
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-evenly text-center mt-2">
          <StatPill label="Posts" value={counts.posts} />
          <button
            onClick={loadFollowers}
            className="flex flex-col items-center hover:text-neutral-900"
          >
            <div className="text-lg font-semibold text-neutral-900">
              {counts.followers}
            </div>
            <div className="text-[11px] text-neutral-600">Followers</div>
          </button>
          <button
            onClick={loadFollowing}
            className="flex flex-col items-center hover:text-neutral-900"
          >
            <div className="text-lg font-semibold text-neutral-900">
              {counts.following}
            </div>
            <div className="text-[11px] text-neutral-600">Following</div>
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-center mt-2">
          <button
            onClick={toggleFollow}
            className="px-4 py-1.5 rounded-xl border border-neutral-300 font-medium hover:bg-neutral-50"
          >
            {isFollowing ? 'Unfollow' : 'Follow'}
          </button>

          <Link
            href={`/chat/${profile.id}`}
            className="px-4 py-1.5 rounded-xl border border-neutral-300 font-medium hover:bg-neutral-50"
          >
            Message
          </Link>

          <Link
            href={`/book/${profile.id}`}
            className="px-4 py-1.5 rounded-xl bg-neutral-900 text-white font-medium rounded-xl hover:bg-black"
          >
            Book
          </Link>

          <button
            onClick={() =>
              navigator.clipboard.writeText(
                `${window.location.origin}/profile/${profile.id}`,
              )
            }
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

      {/* TABS */}
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
          {posts.length === 0 ? (
            <div className="border border-dashed border-neutral-300 rounded-2xl py-10 flex flex-col items-center justify-center bg-neutral-50 text-neutral-600">
              No media uploaded yet.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {posts.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => openModal(i)}
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
          {/* About + Links */}
          <section className="rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="px-5 py-6 space-y-6">
              {profile.bio && (
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    About
                  </h2>
                  <p className="text-neutral-700 leading-relaxed whitespace-pre-line">
                    {profile.bio}
                  </p>
                </div>
              )}

              {profile.links && Object.keys(profile.links).length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-neutral-900">Links</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(profile.links)
                      .filter(([, v]) => !!v)
                      .map(([k, v]) => (
                        <a
                          key={k}
                          href={v as string}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 rounded-full border border-neutral-300 text-[13px] text-neutral-800 hover:bg-neutral-50"
                        >
                          {k}
                        </a>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Achievements / Shows / Skills / Recommendations */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Left column */}
            <div className="space-y-4">
              {/* Achievements */}
              <section className="rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.04)] px-5 py-5">
                <h2 className="text-lg font-semibold mb-2 text-neutral-900">
                  Achievements
                </h2>
                {achievements.length === 0 ? (
                  <p className="text-[13px] text-neutral-500">
                    No achievements yet.
                  </p>
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
                          <div className="text-[13px] text-neutral-700">
                            {a.description}
                          </div>
                        )}
                        {a.year && (
                          <div className="text-[13px] text-neutral-500">
                            {a.year}
                          </div>
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
                  <p className="text-[13px] text-neutral-500">No shows yet.</p>
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
                        <div className="text-[13px] text-neutral-700">
                          {[s.venue, s.location].filter(Boolean).join(', ')}
                        </div>
                        {s.event_date && (
                          <div className="text-[13px] text-neutral-500">
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
                <h2 className="text-lg font-semibold mb-2 text-neutral-900">
                  Skills
                </h2>
                {skills.length === 0 ? (
                  <p className="text-[13px] text-neutral-500">No skills yet.</p>
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
                        <span className="text-[13px] italic text-neutral-600">
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
                  <p className="text-[13px] text-neutral-500">
                    No recommendations yet.
                  </p>
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
                          <p className="text-xs mt-1 text-neutral-500">
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
          <button
            type="button"
            className="absolute inset-0"
            onClick={closeModal}
          />
          <div className="relative max-w-3xl w-full px-4">
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-2 right-4 text-3xl font-bold text-white"
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

            {posts.length > 1 && (
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
          <div className="bg-white rounded-3xl w-full max-w-md mx-auto max-height-[80vh] max-h-[80vh] overflow-y-auto p-6 relative">
            <button
              className="absolute top-3 right-4 text-3xl font-bold text-neutral-900"
              onClick={() => setShowFollowersModal(false)}
            >
              ×
            </button>

            <h2 className="text-xl font-semibold mb-4 text-neutral-900">
              Followers
            </h2>

            {followersList.length === 0 ? (
              <p className="text-[13px] text-neutral-500">No followers yet.</p>
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
                        <p className="font-medium text-neutral-900">
                          {user.display_name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          @{user.handle}
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
                            : 'bg-neutral-900 text-white'
                        }`}
                      >
                        {myFollowingIds.includes(user.id)
                          ? 'Unfollow'
                          : 'Follow'}
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
              className="absolute top-3 right-4 text-3xl font-bold text-neutral-900"
              onClick={() => setShowFollowingModal(false)}
            >
              ×
            </button>

            <h2 className="text-xl font-semibold mb-4 text-neutral-900">
              Following
            </h2>

            {followingList.length === 0 ? (
              <p className="text-[13px] text-neutral-500">
                Not following anyone yet.
              </p>
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
                        <p className="font-medium text-neutral-900">
                          {user.display_name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          @{user.handle}
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
                            : 'bg-neutral-900 text-white'
                        }`}
                      >
                        {myFollowingIds.includes(user.id)
                          ? 'Unfollow'
                          : 'Follow'}
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
    SMALL STAT COMPONENT
--------------------------------------------------------- */
function StatPill({
  label,
  value,
  inverse,
}: {
  label: string;
  value: number;
  inverse?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className={`text-lg font-semibold ${
          inverse ? 'text-white' : 'text-neutral-900'
        }`}
      >
        {value}
      </div>
      <div
        className={`text-[11px] ${
          inverse ? 'text-neutral-200' : 'text-neutral-600'
        }`}
      >
        {label}
      </div>
    </div>
  );
}
