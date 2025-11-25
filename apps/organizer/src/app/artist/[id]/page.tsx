'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';
import Link from 'next/link';

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
        setMedia(m ?? []);

        // ACHIEVEMENTS
        const { data: a, error: aErr } = await supabase
          .from('achievements')
          .select('*')
          .eq('profile_id', id)
          .order('created_at', { ascending: false });

        if (aErr) throw aErr;
        setAchievements(a ?? []);

        // SHOWS
        const { data: s, error: sErr } = await supabase
          .from('shows')
          .select('*')
          .eq('profile_id', id)
          .order('event_date', { ascending: false });

        if (sErr) throw sErr;
        setShows(s ?? []);

        // SKILLS
        const { data: sk, error: skErr } = await supabase
          .from('skills')
          .select('*')
          .eq('profile_id', id)
          .order('created_at', { ascending: false });

        if (skErr) throw skErr;
        setSkills(sk ?? []);

        // RECOMMENDATIONS
        const { data: r, error: rErr } = await supabase
          .from('recommendations')
          .select('*')
          .eq('profile_id', id)
          .order('created_at', { ascending: false });

        if (rErr) throw rErr;
        setRecommendations(r ?? []);
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
    <main className="max-w-4xl mx-auto p-6 space-y-10">

      {/* HEADER */}
      <section className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <img
          src={profile.avatar_url || '/default-avatar.png'}
          alt={profile.display_name ?? 'Artist avatar'}
          className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border"
        />
        <div className="flex-1 text-center sm:text-left space-y-2">
          <div>
            <h1 className="text-3xl font-semibold">{profile.display_name}</h1>
            <p className="text-gray-600">
              @{profile.display_name?.toLowerCase().replace(/\s+/g, '') ?? profile.id.slice(0, 8)}
            </p>
          </div>
          <p className="text-gray-800">{profile.bio}</p>
          {profile.location && (
            <p className="text-sm text-gray-500">{profile.location}</p>
          )}

          <div className="mt-4 flex justify-center sm:justify-start gap-3">
            <Link 
              href={`/book/${profile.id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl inline-flex items-center justify-center"
            >
              Book Musician
            </Link>
            <button className="px-4 py-2 border rounded-xl">Follow</button>
          </div>

          {/* Stats */}
          <div className="mt-4 flex justify-center sm:justify-start gap-10 text-center">
            <div>
              <div className="text-xl font-semibold">{profile.stats_posts ?? 0}</div>
              <div className="text-sm text-gray-600">Posts</div>
            </div>
            <div>
              <div className="text-xl font-semibold">{profile.stats_followers ?? 0}</div>
              <div className="text-sm text-gray-600">Followers</div>
            </div>
            <div>
              <div className="text-xl font-semibold">{profile.stats_following ?? 0}</div>
              <div className="text-sm text-gray-600">Following</div>
            </div>
          </div>
        </div>
      </section>

      {/* TABS */}
      <div className="flex gap-6 border-b pb-2 mt-2">
        <button
          onClick={() => setActiveTab('media')}
          className={`pb-2 text-lg font-medium ${
            activeTab === 'media' ? 'border-b-2 border-black' : 'text-gray-500'
          }`}
        >
          Media
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`pb-2 text-lg font-medium ${
            activeTab === 'about' ? 'border-b-2 border-black' : 'text-gray-500'
          }`}
        >
          About
        </button>
      </div>

      {/* MEDIA TAB */}
      {activeTab === 'media' && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Media</h2>
          {media.length === 0 ? (
            <p className="text-gray-500">No media uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {media.map((item, index) => (
                <div
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
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ABOUT TAB */}
      {activeTab === 'about' && (
        <section className="space-y-10">

          {/* Achievements */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Achievements</h2>
            {achievements.length === 0 ? (
              <p className="text-gray-500">No achievements added yet.</p>
            ) : (
              <ul className="space-y-2 text-gray-800">
                {achievements.map(a => (
                  <li key={a.id} className="border p-3 rounded-md bg-gray-50">
                    <strong>{a.title}</strong><br />
                    {a.description}
                    {a.year && (
                      <div className="text-sm text-gray-500">({a.year})</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent Shows */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Recent Shows</h2>
            {shows.length === 0 ? (
              <p className="text-gray-500">No shows added yet.</p>
            ) : (
              <ul className="space-y-2 text-gray-800">
                {shows.map(s => (
                  <li key={s.id} className="border p-3 rounded-md bg-gray-50">
                    <strong>{s.title}</strong>{' — '}
                    {[s.venue, s.location].filter(Boolean).join(', ')}
                    {s.event_date && (
                      <span>
                        {' — '}
                        {new Date(s.event_date).toLocaleDateString()}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Skills */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Skills</h2>
            {skills.length === 0 ? (
              <p className="text-gray-500">No skills added yet.</p>
            ) : (
              <ul className="grid sm:grid-cols-2 gap-3 text-gray-800">
                {skills.map(sk => (
                  <li
                    key={sk.id}
                    className="border p-3 rounded-md bg-gray-50 flex justify-between"
                  >
                    <span>{sk.skill}</span>
                    <span className="italic text-sm text-gray-600">
                      {sk.level}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recommendations */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Recommendations</h2>
            {recommendations.length === 0 ? (
              <p className="text-gray-500">No recommendations yet.</p>
            ) : (
              <div className="space-y-4">
                {recommendations.map(r => (
                  <blockquote
                    key={r.id}
                    className="border-l-4 pl-4 py-2 bg-gray-50 rounded-md italic text-gray-700"
                  >
                    “{r.content}”
                    <div className="text-sm mt-1 text-gray-500">
                      — {r.author}
                    </div>
                  </blockquote>
                ))}
              </div>
            )}
          </section>

          {/* Social Links */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Social Links</h2>
            <div className="flex flex-wrap gap-4 text-blue-600 underline">
              {links.instagram && (
                <a href={links.instagram} target="_blank" rel="noreferrer">
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
        </section>
      )}

      {/* MEDIA MODAL */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          {/* Overlay */}
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={closeModal}
          />
          {/* Content */}
          <div className="relative max-w-3xl w-full px-4 z-50">
            {selectedMedia.type === 'image' ? (
              <img
                src={selectedMedia.url}
                className="w-full max-h-[90vh] object-contain rounded-md"
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
              className="absolute top-2 right-2 text-white text-3xl font-bold"
              onClick={closeModal}
            >
              ×
            </button>

            {/* Prev / Next */}
            {media.length > 1 && (
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
