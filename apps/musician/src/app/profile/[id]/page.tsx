'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';

type MediaItem = { id: string; url: string; type: 'image' | 'video' };

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
  location: string | null;
  genres: string[] | null;
  links: Record<string, string> | null;
  quote: string | null;
  stats_posts?: number | null;
  stats_followers?: number | null;
  stats_following?: number | null;
};

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'media' | 'about'>('media');

  // Load profile + related data
  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        // PROFILE
        const { data: p, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (profileErr) throw profileErr;
        if (!p) throw new Error('Profile not found');

        setProfile(p as Profile);

        // MEDIA
        const { data: m, error: mErr } = await supabase
          .from('media')
          .select('*')
          .eq('profile_id', id)
          .order('created_at', { ascending: false });

        if (mErr) throw mErr;
        setMedia((m ?? []) as MediaItem[]);

        // ACHIEVEMENTS
        const { data: a, error: aErr } = await supabase
          .from('achievements')
          .select('*')
          .eq('profile_id', id)
          .order('created_at', { ascending: false });

        if (aErr) throw aErr;
        setAchievements((a ?? []) as Achievement[]);

        // SHOWS
        const { data: s, error: sErr } = await supabase
          .from('shows')
          .select('*')
          .eq('profile_id', id)
          .order('event_date', { ascending: false });

        if (sErr) throw sErr;
        setShows((s ?? []) as Show[]);

        // SKILLS
        const { data: sk, error: skErr } = await supabase
          .from('skills')
          .select('*')
          .eq('profile_id', id)
          .order('created_at', { ascending: false });

        if (skErr) throw skErr;
        setSkills((sk ?? []) as Skill[]);

        // RECOMMENDATIONS
        const { data: r, error: rErr } = await supabase
          .from('recommendations')
          .select('*')
          .eq('profile_id', id)
          .order('created_at', { ascending: false });

        if (rErr) throw rErr;
        setRecommendations((r ?? []) as Recommendation[]);
      } catch (e) {
        console.error('PUBLIC PROFILE LOAD ERROR:', e);
        if (e instanceof Error) setErr(e.message);
        else setErr('Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ESC to close modal
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectedMedia(null);
      }
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  if (loading) return <main className="p-6">Loading profile…</main>;
  if (err || !profile) {
    return (
      <main className="p-6 text-red-600">
        Error: {err ?? 'Profile not found'}
      </main>
    );
  }

  const links = profile.links || {};
  const username =
    profile.display_name?.toLowerCase().replace(/\s+/g, '') ??
    profile.id.slice(0, 8);

  function openModal(index: number) {
    setSelectedIndex(index);
    setSelectedMedia(media[index]);
  }

  function closeModal() {
    setSelectedMedia(null);
  }

  function showNext() {
    if (!media.length) return;
    const nextIndex = (selectedIndex + 1) % media.length;
    setSelectedIndex(nextIndex);
    setSelectedMedia(media[nextIndex]);
  }

  function showPrev() {
    if (!media.length) return;
    const prevIndex = (selectedIndex - 1 + media.length) % media.length;
    setSelectedIndex(prevIndex);
    setSelectedMedia(media[prevIndex]);
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-10">
      {/* HEADER */}
      <section className="flex flex-col md:flex-row gap-8 md:items-start">
        {/* Avatar */}
        <div className="flex-shrink-0 flex justify-center md:block">
          <img
            src={profile.avatar_url || '/default-avatar.png'}
            alt={profile.display_name ?? 'Artist avatar'}
            className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border border-gray-200"
          />
        </div>

        {/* Main info */}
        <div className="flex-1 space-y-4 text-center md:text-left">
          <div>
            <h1 className="text-3xl font-semibold">
              {profile.display_name ?? 'Unnamed artist'}
            </h1>
            <p className="text-sm text-gray-500">@{username}</p>
          </div>

          {profile.bio && (
            <p className="text-sm text-gray-800 leading-relaxed">{profile.bio}</p>
          )}

          {profile.location && (
            <p className="text-sm text-gray-500">{profile.location}</p>
          )}

          {profile.genres && profile.genres.length > 0 && (
            <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
              {profile.genres.map((g) => (
                <span
                  key={g}
                  className="px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-700"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3">
            <a
              href={`/book/${profile.id}`}
              className="px-4 py-2 rounded-xl border border-black text-sm font-medium hover:bg-black hover:text-white transition"
            >
              Book
            </a>
            <a
              href={`/chat/${profile.id}`}
              className="px-4 py-2 rounded-xl border text-sm hover:bg-gray-50"
            >
              Message
            </a>
            <button className="px-4 py-2 rounded-xl border text-sm hover:bg-gray-50">
              Follow
            </button>
          </div>
        </div>

        {/* Stats card */}
        <aside className="w-full md:w-48 flex md:flex-col justify-around md:justify-start gap-4 md:gap-3 text-center">
          <StatBlock label="Posts" value={profile.stats_posts ?? 0} />
          <StatBlock label="Followers" value={profile.stats_followers ?? 0} />
          <StatBlock label="Following" value={profile.stats_following ?? 0} />
        </aside>
      </section>

      {/* Artist quote */}
      {profile.quote && (
        <section className="border rounded-2xl p-5 bg-gray-50">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Artist Quote
          </p>
          <p className="mt-2 text-lg md:text-xl italic text-gray-900">
            “{profile.quote}”
          </p>
        </section>
      )}

      {/* TABS */}
      <div className="flex gap-6 border-b pb-2 mt-2">
        <button
          onClick={() => setActiveTab('media')}
          className={`pb-2 text-sm md:text-base font-medium ${
            activeTab === 'media'
              ? 'border-b-2 border-black text-black'
              : 'text-gray-500'
          }`}
        >
          Media
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`pb-2 text-sm md:text-base font-medium ${
            activeTab === 'about'
              ? 'border-b-2 border-black text-black'
              : 'text-gray-500'
          }`}
        >
          About
        </button>
      </div>

      {/* MEDIA TAB */}
      {activeTab === 'media' && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Media</h2>
          {media.length === 0 ? (
            <p className="text-sm text-gray-500">No media uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
              {media.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => openModal(index)}
                  className="relative w-full pb-[100%] bg-gray-100 overflow-hidden rounded-md cursor-pointer hover:opacity-90 transition"
                >
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={item.url}
                      className="absolute inset-0 w-full h-full object-cover"
                      muted
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
        <section className="space-y-10">
          <div className="grid md:grid-cols-2 gap-8">
            {/* LEFT COLUMN */}
            <div className="space-y-8">
              {/* Achievements */}
              <section>
                <h2 className="text-lg font-semibold mb-3">Achievements</h2>
                {achievements.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No achievements added yet.
                  </p>
                ) : (
                  <ul className="space-y-2 text-gray-800">
                    {achievements.map((a) => (
                      <li
                        key={a.id}
                        className="border p-3 rounded-md bg-gray-50 space-y-1"
                      >
                        <p className="font-medium">{a.title}</p>
                        {a.description && (
                          <p className="text-sm text-gray-700">
                            {a.description}
                          </p>
                        )}
                        {a.year && (
                          <p className="text-xs text-gray-500">{a.year}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Recent Shows */}
              <section>
                <h2 className="text-lg font-semibold mb-3">Recent Shows</h2>
                {shows.length === 0 ? (
                  <p className="text-sm text-gray-500">No shows added yet.</p>
                ) : (
                  <ul className="space-y-2 text-gray-800">
                    {shows.map((s) => (
                      <li
                        key={s.id}
                        className="border p-3 rounded-md bg-gray-50 space-y-1"
                      >
                        <p className="font-medium">{s.title}</p>
                        <p className="text-sm text-gray-700">
                          {[s.venue, s.location].filter(Boolean).join(', ')}
                        </p>
                        {s.event_date && (
                          <p className="text-xs text-gray-500">
                            {new Date(s.event_date).toLocaleDateString()}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-8">
              {/* Skills */}
              <section>
                <h2 className="text-lg font-semibold mb-3">Skills</h2>
                {skills.length === 0 ? (
                  <p className="text-sm text-gray-500">No skills added yet.</p>
                ) : (
                  <ul className="grid sm:grid-cols-2 gap-3 text-gray-800">
                    {skills.map((sk) => (
                      <li
                        key={sk.id}
                        className="border p-3 rounded-md bg-gray-50 flex justify-between items-center"
                      >
                        <span className="text-sm">{sk.skill}</span>
                        <span className="text-xs italic text-gray-600">
                          {sk.level}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Recommendations */}
              <section>
                <h2 className="text-lg font-semibold mb-3">Recommendations</h2>
                {recommendations.length === 0 ? (
                  <p className="text-sm text-gray-500">No recommendations yet.</p>
                ) : (
                  <div className="space-y-4">
                    {recommendations.map((r) => (
                      <blockquote
                        key={r.id}
                        className="border-l-4 pl-4 py-2 bg-gray-50 rounded-md italic text-gray-700"
                      >
                        “{r.content}”
                        <div className="text-xs mt-1 text-gray-500">
                          — {r.author}
                        </div>
                      </blockquote>
                    ))}
                  </div>
                )}
              </section>

              {/* Social Links */}
              <section>
                <h2 className="text-lg font-semibold mb-3">Social Links</h2>
                <div className="flex flex-wrap gap-4 text-sm text-blue-600 underline">
                  {links.instagram && (
                    <a
                      href={links.instagram}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Instagram
                    </a>
                  )}
                  {links.youtube && (
                    <a href={links.youtube} target="_blank" rel="noreferrer">
                      YouTube
                    </a>
                  )}
                  {links.website && (
                    <a href={links.website} target="_blank" rel="noreferrer">
                      Website
                    </a>
                  )}
                </div>
              </section>
            </div>
          </div>
        </section>
      )}

      {/* MEDIA MODAL */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          {/* Overlay */}
          <button
            type="button"
            className="absolute inset-0 cursor-pointer"
            onClick={closeModal}
          />

          {/* Content */}
          <div className="relative max-w-3xl w-full px-4 z-50">
            {selectedMedia.type === 'image' ? (
              <img
                src={selectedMedia.url}
                className="w-full max-h-[90vh] object-contain rounded-md"
                alt=""
              />
            ) : (
              <video
                src={selectedMedia.url}
                controls
                className="w-full max-h-[90vh] object-contain rounded-md"
              />
            )}

            {/* Close */}
            <button
              type="button"
              className="absolute top-2 right-2 text-white text-3xl font-bold"
              onClick={closeModal}
            >
              ×
            </button>

            {/* Prev / Next */}
            {media.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={showPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-white text-4xl"
                >
                  ‹
                </button>
                <button
                  type="button"
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

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 md:flex-none md:w-full border rounded-xl py-3 px-4 bg-gray-50">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}
