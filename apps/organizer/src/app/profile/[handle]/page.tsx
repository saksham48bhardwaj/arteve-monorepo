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

  useEffect(() => {
    if (!handle) return;

    (async () => {
      try {
        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('handle', handle)
          .maybeSingle();

        if (pErr || !p) throw new Error('Profile not found');

        const prof = p as BaseProfile;
        setProfile(prof);

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

  async function toggleFollow() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      alert('Login required.');
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
      setCounts(c => ({ ...c, followers: c.followers - 1 }));
    } else {
      await supabase.from('followers').insert({
        follower_id: auth.user.id,
        following_id: profile.id,
      });

      setIsFollowing(true);
      setCounts(c => ({ ...c, followers: c.followers + 1 }));
    }
  }

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

  const genres = profile.genres ?? [];

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      {/* HEADER CARD */}
      <section className="rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.06)] p-6 sm:p-7 space-y-6">
        <div className="flex items-start gap-6">
          <img
            src={profile.avatar_url ?? '/default-avatar.png'}
            className="w-24 h-24 rounded-full object-cover border border-neutral-300"
            alt=""
          />

          <div className="flex-1 space-y-1">
            <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900">
              {profile.display_name}
            </h1>
            <p className="text-[13px] text-neutral-500">@{profile.handle}</p>
            {profile.location && (
              <p className="text-[13px] text-neutral-600">
                {profile.location}
              </p>
            )}

            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
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

        {/* STATS */}
        <div className="flex justify-evenly text-center mt-2">
          <StatPill label="Posts" value={counts.posts} />
          <StatPill label="Followers" value={counts.followers} />
          <StatPill label="Following" value={counts.following} />
        </div>

        {/* PUBLIC ACTION BUTTONS */}
        <div className="flex gap-2 justify-center mt-2 flex-wrap">
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

          <button className="px-4 py-1.5 rounded-xl border border-neutral-300 font-medium hover:bg-neutral-50">
            Save
          </button>
        </div>

        {/* QUOTE */}
        {profile.quote && (
          <div className="px-4 py-3 rounded-xl bg-neutral-50">
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
        <section className="rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.04)] p-5 sm:p-6">
          {posts.length === 0 ? (
            <p className="text-[13px] text-neutral-500 text-center py-8">
              No media uploaded yet.
            </p>
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
          <section className="rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.04)] p-5">
            {profile.bio && (
              <div className="mb-4 space-y-2">
                <h2 className="text-lg font-semibold text-neutral-900">
                  About
                </h2>
                <p className="text-neutral-700 leading-relaxed whitespace-pre-line">
                  {profile.bio}
                </p>
              </div>
            )}

            {profile.links && Object.keys(profile.links).length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-neutral-900">
                  Links
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(profile.links)
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <a
                        key={k}
                        target="_blank"
                        href={v as string}
                        className="px-3 py-1 rounded-full border border-neutral-300 text-[13px] text-neutral-800 hover:bg-neutral-50"
                      >
                        {k}
                      </a>
                    ))}
                </div>
              </div>
            )}
          </section>

          {/* Achievements */}
          <section className="rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.04)] p-5">
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
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 space-y-1"
                  >
                    <p className="font-medium text-neutral-900">
                      {a.title}
                    </p>
                    {a.description && (
                      <p className="text-[13px] text-neutral-700">
                        {a.description}
                      </p>
                    )}
                    {a.year && (
                      <p className="text-[13px] text-neutral-500">
                        {a.year}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent Shows */}
          <section className="rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.04)] p-5">
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
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 space-y-1"
                  >
                    <p className="font-medium text-neutral-900">
                      {s.title}
                    </p>
                    <p className="text-[13px] text-neutral-700">
                      {[s.venue, s.location].filter(Boolean).join(', ')}
                    </p>
                    {s.event_date && (
                      <p className="text-[13px] text-neutral-500">
                        {new Date(s.event_date).toLocaleDateString()}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Skills */}
          <section className="rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.04)] p-5">
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
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 flex justify-between items-center"
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
          <section className="rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.04)] p-5">
            <h2 className="text-lg font-semibold mb-2 text-neutral-900">
              Recommendations
            </h2>
            {recommendations.length === 0 ? (
              <p className="text-[13px] text-neutral-500">None yet.</p>
            ) : (
              <div className="space-y-3">
                {recommendations.map(rec => (
                  <blockquote
                    key={rec.id}
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3"
                  >
                    <p className="italic text-neutral-900">
                      “{rec.content}”
                    </p>
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
          <div className="relative max-w-3xl w-full px-4">
            <button
              onClick={closeModal}
              className="absolute top-2 right-4 text-3xl font-bold text-white"
            >
              ×
            </button>

            {selectedMedia.media_type === 'image' ? (
              <img
                src={selectedMedia.media_url}
                className="w-full rounded-2xl max-h-[90vh] object-contain"
                alt=""
              />
            ) : (
              <video
                src={selectedMedia.media_url}
                controls
                className="w-full rounded-2xl max-h-[90vh]"
              />
            )}

            {posts.length > 1 && (
              <>
                <button
                  onClick={showPrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-4xl text-white"
                >
                  ‹
                </button>
                <button
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
    </main>
  );
}

/* Small stat block reused */
function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="text-lg font-semibold text-neutral-900">{value}</div>
      <div className="text-[11px] text-neutral-600">{label}</div>
    </div>
  );
}
