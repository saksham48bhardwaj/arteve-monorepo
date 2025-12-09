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
};

/* ---------------------------------------------------------------------- */
/*  ORGANIZER PUBLIC VIEW                                                 */
/* ---------------------------------------------------------------------- */

export default function OrganizerMusicianProfilePage() {
  const { handle } = useParams<{ handle: string }>();

  const [profile, setProfile] = useState<BaseProfile | null>(null);
  const [posts, setPosts] = useState<PostMedia[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [counts, setCounts] = useState({
    posts: 0,
    followers: 0,
    following: 0,
  });

  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'media' | 'about'>('media');

  // Media modal
  const [selectedMedia, setSelectedMedia] = useState<PostMedia | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  /* ------------------------- Load Full Profile ------------------------- */

  useEffect(() => {
    if (!handle) return;

    (async () => {
      try {
        // Fetch profile
        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('handle', handle)
          .maybeSingle();

        if (pErr || !p) throw new Error('Profile not found');

        const prof = p as BaseProfile;
        setProfile(prof);

        // Fetch stats
        const [postsRes, followersRes, followingRes] = await Promise.all([
          supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('profile_id', prof.id),

          supabase
            .from('followers')
            .select('id', { count: 'exact', head: true })
            .eq('following_id', prof.id),

          supabase
            .from('followers')
            .select('id', { count: 'exact', head: true })
            .eq('follower_id', prof.id),
        ]);

        setCounts({
          posts: postsRes.count || 0,
          followers: followersRes.count || 0,
          following: followingRes.count || 0,
        });

        // Check if organizer follows this musician
        const { data: auth } = await supabase.auth.getUser();
        const currentUserId = auth.user?.id;

        if (currentUserId) {
          const { data: followData } = await supabase
            .from('followers')
            .select('*')
            .eq('follower_id', currentUserId)
            .eq('following_id', prof.id)
            .maybeSingle();

          setIsFollowing(!!followData);
        }

        // Fetch musician sections
        const [
          { data: postData },
          { data: a },
          { data: s },
          { data: sk },
          { data: r },
        ] = await Promise.all([
          supabase
            .from('posts')
            .select('*')
            .eq('profile_id', prof.id)
            .order('created_at', { ascending: false }),

          supabase.from('achievements').select('*').eq('profile_id', prof.id),
          supabase.from('shows').select('*').eq('profile_id', prof.id),
          supabase.from('skills').select('*').eq('profile_id', prof.id),
          supabase
            .from('recommendations')
            .select('*')
            .eq('profile_id', prof.id),
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

  /* ------------------------- Follow toggle ------------------------- */

  async function toggleFollow() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return alert('Login required.');

    if (!profile) return;

    if (isFollowing) {
      await supabase
        .from('followers')
        .delete()
        .eq('follower_id', auth.user.id)
        .eq('following_id', profile.id);

      setIsFollowing(false);
      setCounts((c) => ({ ...c, followers: c.followers - 1 }));
    } else {
      await supabase.from('followers').insert({
        follower_id: auth.user.id,
        following_id: profile.id,
      });

      setIsFollowing(true);
      setCounts((c) => ({ ...c, followers: c.followers + 1 }));
    }
  }

  /* --------------------------- Modal Controls --------------------------- */

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

  /* --------------------------- UI States --------------------------- */

  if (loading) return <main className="p-6">Loading profile…</main>;
  if (err || !profile)
    return <main className="p-6 text-red-600">Error: {err}</main>;

  const genres = profile.genres ?? [];

  /* --------------------------- FULL UI --------------------------- */

  return (
    <main className="w-full max-w-xl mx-auto px-4 py-6 space-y-6">

      {/* HEADER CARD */}
      <section className="rounded-3xl border border-neutral-200 bg-white shadow-sm p-6 space-y-6">
        <div className="flex items-start gap-6">
          <img
            src={profile.avatar_url ?? '/default-avatar.png'}
            className="w-24 h-24 rounded-full object-cover border"
          />

          <div className="flex-1 space-y-1">
            <h1 className="text-xl font-semibold">{profile.display_name}</h1>
            <p className="text-xs text-neutral-500">@{profile.handle}</p>
            {profile.location && (
              <p className="text-xs text-neutral-600">{profile.location}</p>
            )}

            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {genres.map((g) => (
                  <span
                    key={g}
                    className="px-3 py-1 rounded-full bg-neutral-100 text-xs"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* STATS */}
        <div className="flex justify-around text-center mt-2">
          <div>
            <p className="text-lg font-semibold">{counts.posts}</p>
            <p className="text-[11px] text-neutral-500">Posts</p>
          </div>

          <div>
            <p className="text-lg font-semibold">{counts.followers}</p>
            <p className="text-[11px] text-neutral-500">Followers</p>
          </div>

          <div>
            <p className="text-lg font-semibold">{counts.following}</p>
            <p className="text-[11px] text-neutral-500">Following</p>
          </div>
        </div>

        {/* PUBLIC ACTION BUTTONS */}
        <div className="flex gap-2 justify-center mt-1">
          <button
            onClick={toggleFollow}
            className="px-4 py-1.5 rounded-lg border text-sm"
          >
            {isFollowing ? 'Unfollow' : 'Follow'}
          </button>

          <Link
            href={`/chat/${profile.id}`}
            className="px-4 py-1.5 rounded-lg border text-sm"
          >
            Message
          </Link>

          <Link
            href={`/book/${profile.id}`}
            className="px-4 py-1.5 rounded-lg bg-black text-white text-sm rounded-lg"
          >
            Book
          </Link>

          <button className="px-4 py-1.5 rounded-lg border text-sm">Save</button>
        </div>

        {/* QUOTE */}
        {profile.quote && (
          <div className="px-4 py-3 rounded-xl bg-neutral-100">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">
              Artist Quote
            </p>
            <p className="mt-1 text-sm italic text-neutral-700">
              “{profile.quote}”
            </p>
          </div>
        )}
      </section>

      {/* TABS */}
      <div className="flex gap-6 border-b pb-1">
        <button
          onClick={() => setActiveTab('media')}
          className={`pb-2 text-sm font-medium ${
            activeTab === 'media'
              ? 'border-b-2 border-black text-black'
              : 'text-neutral-500'
          }`}
        >
          Media
        </button>

        <button
          onClick={() => setActiveTab('about')}
          className={`pb-2 text-sm font-medium ${
            activeTab === 'about'
              ? 'border-b-2 border-black text-black'
              : 'text-neutral-500'
          }`}
        >
          About
        </button>
      </div>

      {/* MEDIA TAB */}
      {activeTab === 'media' && (
        <section className="rounded-3xl border bg-white shadow-sm p-5">
          {posts.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-8">
              No media uploaded yet.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {posts.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => openModal(i)}
                  className="relative w-full pb-[100%] rounded-xl overflow-hidden bg-neutral-100"
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
          <section className="rounded-3xl border bg-white shadow-sm p-5">
            {profile.bio && (
              <div className="mb-4">
                <h2 className="text-lg font-semibold">About</h2>
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {profile.bio}
                </p>
              </div>
            )}

            {profile.links && Object.keys(profile.links).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-1">Links</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(profile.links)
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <a
                        key={k}
                        target="_blank"
                        href={v as string}
                        className="px-3 py-1 rounded-full border text-xs"
                      >
                        {k}
                      </a>
                    ))}
                </div>
              </div>
            )}
          </section>

          {/* Achievements */}
          <section className="rounded-3xl border bg-white shadow-sm p-5">
            <h2 className="text-lg font-semibold mb-2">Achievements</h2>
            {achievements.length === 0 ? (
              <p className="text-sm text-neutral-500">No achievements yet.</p>
            ) : (
              <ul className="space-y-2">
                {achievements.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-xl border bg-neutral-50 p-3 space-y-1"
                  >
                    <p className="text-sm font-medium">{a.title}</p>
                    {a.description && (
                      <p className="text-xs text-neutral-700">
                        {a.description}
                      </p>
                    )}
                    {a.year && (
                      <p className="text-xs text-neutral-500">{a.year}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent Shows */}
          <section className="rounded-3xl border bg-white shadow-sm p-5">
            <h2 className="text-lg font-semibold mb-2">Recent Shows</h2>

            {shows.length === 0 ? (
              <p className="text-sm text-neutral-500">No shows yet.</p>
            ) : (
              <ul className="space-y-2">
                {shows.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-xl border bg-neutral-50 p-3 space-y-1"
                  >
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-neutral-700">
                      {[s.venue, s.location].filter(Boolean).join(', ')}
                    </p>
                    {s.event_date && (
                      <p className="text-xs text-neutral-500">
                        {new Date(s.event_date).toLocaleDateString()}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Skills */}
          <section className="rounded-3xl border bg-white shadow-sm p-5">
            <h2 className="text-lg font-semibold mb-2">Skills</h2>

            {skills.length === 0 ? (
              <p className="text-sm text-neutral-500">No skills yet.</p>
            ) : (
              <ul className="space-y-2">
                {skills.map((sk) => (
                  <li
                    key={sk.id}
                    className="rounded-xl border bg-neutral-50 p-3 flex justify-between"
                  >
                    <span className="text-sm font-medium">{sk.skill}</span>
                    <span className="text-xs italic text-neutral-500">
                      {sk.level}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recommendations */}
          <section className="rounded-3xl border bg-white shadow-sm p-5">
            <h2 className="text-lg font-semibold mb-2">Recommendations</h2>

            {recommendations.length === 0 ? (
              <p className="text-sm text-neutral-500">None yet.</p>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <blockquote
                    key={rec.id}
                    className="rounded-xl border bg-neutral-50 p-3"
                  >
                    <p className="text-sm italic">“{rec.content}”</p>
                    {rec.author && (
                      <p className="text-xs mt-1 text-neutral-500">
                        — {rec.author}
                      </p>
                    )}
                  </blockquote>
                ))}
              </div>
            )}
          </section>
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
              <video
                src={selectedMedia.media_url}
                controls
                className="w-full rounded-2xl"
              />
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
