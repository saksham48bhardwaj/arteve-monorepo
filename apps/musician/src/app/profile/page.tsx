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
  stats_posts: number | null;
  stats_followers: number | null;
  stats_following: number | null;
};

type MediaItem = {
  id: string;
  url: string;
  type: 'image' | 'video';
};

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'media' | 'about'>('media');

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        // PROFILE
        const { data: p, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileErr) throw profileErr;
        if (!p) throw new Error('Profile row not found.');

        setProfile(p as Profile);

        // ACHIEVEMENTS
        const { data: a, error: aErr } = await supabase
          .from('achievements')
          .select('*')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false });

        if (aErr) throw aErr;
        setAchievements((a ?? []) as Achievement[]);

        // SHOWS
        const { data: s, error: sErr } = await supabase
          .from('shows')
          .select('*')
          .eq('profile_id', user.id)
          .order('event_date', { ascending: false });

        if (sErr) throw sErr;
        setShows((s ?? []) as Show[]);

        // SKILLS
        const { data: sk, error: skErr } = await supabase
          .from('skills')
          .select('*')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false });

        if (skErr) throw skErr;
        setSkills((sk ?? []) as Skill[]);

        // MEDIA
        const { data: m, error: mErr } = await supabase
          .from('media')
          .select('*')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false });

        if (mErr) throw mErr;
        setMedia((m ?? []) as MediaItem[]);

        // RECOMMENDATIONS
        const { data: r, error: rErr } = await supabase
          .from('recommendations')
          .select('*')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false });

        if (rErr) throw rErr;
        setRecommendations((r ?? []) as Recommendation[]);
      } catch (e: unknown) {
        console.error('PROFILE LOAD ERROR:', e);
        if (e instanceof Error) setErr(e.message);
        else setErr('Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal();
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  if (loading) return <main className="p-6">Loading…</main>;
  if (err) return <main className="p-6 text-red-600">{err}</main>;
  if (!profile) return <main className="p-6">No profile found.</main>;

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!profile) {
        alert('Profile not loaded');
        return;
      }

      setUploading(true);

      const ext = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${ext}`;
      const filePath = `profiles/${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('media').insert({
        profile_id: profile.id,
        url: publicUrl.publicUrl,
        type: file.type.startsWith('video') ? 'video' : 'image',
      });

      if (insertError) throw insertError;

      const { data: m } = await supabase
        .from('media')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });

      setMedia((m ?? []) as MediaItem[]);
    } catch (error) {
      console.error('MEDIA UPLOAD ERROR:', error);
      alert('Failed to upload media');
    } finally {
      setUploading(false);
    }
  }

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

  const username =
    profile.display_name?.toLowerCase().replace(/\s+/g, '') ??
    profile.id.slice(0, 8);

  const primaryMedia = media[0];

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-8 bg-white">
      {/* HEADER CARD */}
      <section className="rounded-3xl border border-gray-200 bg-white shadow-sm px-6 py-6 md:px-10 md:py-8 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0 flex justify-center md:block">
            <img
              src={profile.avatar_url ?? '/placeholder-avatar.png'}
              alt="Avatar"
              className="w-32 h-32 md:w-40 md:h-40 rounded-3xl object-cover border border-gray-200 shadow-sm"
            />
          </div>

          {/* Main info */}
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
                {profile.display_name ?? 'Unnamed artist'}
              </h1>
              <p className="text-xs md:text-sm text-gray-500">@{username}</p>
            </div>

            {profile.location && (
              <p className="text-sm text-gray-500">{profile.location}</p>
            )}

            {profile.genres && profile.genres.length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                {profile.genres.map((g) => (
                  <span
                    key={g}
                    className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-700"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {profile.bio && (
              <p className="text-sm md:text-base text-gray-800 leading-relaxed">
                {profile.bio}
              </p>
            )}

            <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-1">
              <button className="px-4 py-1.5 rounded-full bg-black text-white text-sm">
                Book
              </button>
              <button className="px-4 py-1.5 rounded-full border text-sm">
                Message
              </button>
              <button className="px-4 py-1.5 rounded-full border text-sm">
                Follow
              </button>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 text-xs md:text-sm">
              <Link href="/profile/edit" className="text-blue-600 underline">
                Edit profile
              </Link>
              <Link href="/bookings" className="text-blue-600 underline">
                View booking requests
              </Link>
            </div>
          </div>

          {/* Stats */}
          <aside className="w-full md:w-56 flex md:flex-col justify-around md:justify-start gap-4 md:gap-3 text-center">
            <StatBlock label="Posts" value={profile.stats_posts ?? 0} />
            <StatBlock label="Followers" value={profile.stats_followers ?? 0} />
            <StatBlock label="Following" value={profile.stats_following ?? 0} />
          </aside>
        </div>

        {/* Artist quote under header */}
        {profile.quote && (
          <div className="rounded-2xl bg-gray-50 px-4 py-3 md:px-6 md:py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Artist quote
            </p>
            <p className="mt-1 text-sm md:text-base italic text-gray-900">
              “{profile.quote}”
            </p>
          </div>
        )}
      </section>

      {/* TABS */}
      <div className="flex gap-6 border-b border-gray-200 pb-2 mt-2">
        <button
          onClick={() => setActiveTab('media')}
          className={`pb-2 text-sm md:text-base font-medium tracking-tight ${
            activeTab === 'media'
              ? 'border-b-2 border-black text-black'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Media
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`pb-2 text-sm md:text-base font-medium tracking-tight ${
            activeTab === 'about'
              ? 'border-b-2 border-black text-black'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          About
        </button>
      </div>

      {/* MEDIA TAB */}
      {activeTab === 'media' && (
        <section className="rounded-3xl border border-gray-200 bg-white shadow-sm px-5 py-5 md:px-8 md:py-7 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg md:text-xl font-semibold tracking-tight">
                Media
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Add photos and videos from your performances.
              </p>
            </div>

            <label className="cursor-pointer inline-flex items-center px-3 py-1.5 rounded-full border text-xs md:text-sm hover:bg-gray-50">
              {uploading ? 'Uploading…' : 'Upload media'}
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          </div>

          {media.length === 0 ? (
            <div className="border border-dashed rounded-2xl py-10 flex flex-col items-center justify-center text-center bg-gray-50">
              <p className="text-sm text-gray-600">
                No media uploaded yet.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Upload your best performance photos or videos to showcase your work.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {media.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => openModal(index)}
                  className="relative w-full pb-[100%] bg-gray-100 overflow-hidden rounded-2xl cursor-pointer hover:opacity-90 transition"
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
        <section className="space-y-6">
          {/* ABOUT CARD WITH BANNER */}
          <section className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Banner (inside the box) */}
            <div className="h-40 md:h-52 w-full bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 relative">
              {primaryMedia && primaryMedia.type === 'image' && (
                <img
                  src={primaryMedia.url}
                  alt=""
                  className="w-full h-full object-cover opacity-70"
                />
              )}
              <div className="absolute inset-0 bg-black/20" />
            </div>

            <div className="px-5 py-6 md:px-8 md:py-8 space-y-8">
              {/* About text */}
              {profile.bio && (
                <div className="space-y-1">
                  <h2 className="text-lg md:text-xl font-semibold tracking-tight">
                    About
                  </h2>
                  <p className="text-sm md:text-base text-gray-800 whitespace-pre-line leading-relaxed">
                    {profile.bio}
                  </p>
                </div>
              )}

              {/* External links */}
              {profile.links && Object.keys(profile.links).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Links
                  </h3>
                  <div className="flex flex-wrap gap-3 text-xs md:text-sm">
                    {Object.entries(profile.links)
                      .filter(([, v]) => !!v)
                      .map(([key, value]) => (
                        <a
                          key={key}
                          href={value as string}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 rounded-full border text-gray-700 hover:bg-gray-50"
                        >
                          {key}
                        </a>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* CONTENT GRID (ACHIEVEMENTS / SHOWS / SKILLS / RECOMMENDATIONS) */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              {/* Achievements */}
              <section className="rounded-3xl border border-gray-200 bg-white shadow-sm px-5 py-5 md:px-6 md:py-6">
                <h2 className="text-lg font-semibold mb-3">Achievements</h2>
                {achievements.length === 0 ? (
                  <p className="text-sm text-gray-500">No achievements yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {achievements.map((a) => (
                      <li
                        key={a.id}
                        className="border border-gray-100 p-3 rounded-2xl bg-gray-50"
                      >
                        <div className="font-medium text-sm">
                          {a.title}
                        </div>
                        {a.description && (
                          <div className="text-xs text-gray-700">
                            {a.description}
                          </div>
                        )}
                        {a.year && (
                          <div className="text-xs text-gray-500 mt-1">
                            {a.year}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Recent shows */}
              <section className="rounded-3xl border border-gray-200 bg-white shadow-sm px-5 py-5 md:px-6 md:py-6">
                <h2 className="text-lg font-semibold mb-3">Recent shows</h2>
                {shows.length === 0 ? (
                  <p className="text-sm text-gray-500">No shows yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {shows.map((s) => (
                      <li
                        key={s.id}
                        className="border border-gray-100 p-3 rounded-2xl bg-gray-50"
                      >
                        <div className="font-medium text-sm">{s.title}</div>
                        <div className="text-xs text-gray-700">
                          {[s.venue, s.location].filter(Boolean).join(', ')}
                        </div>
                        {s.event_date && (
                          <div className="text-[11px] text-gray-500 mt-1">
                            {new Date(s.event_date).toLocaleDateString()}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              {/* Skills */}
              <section className="rounded-3xl border border-gray-200 bg-white shadow-sm px-5 py-5 md:px-6 md:py-6">
                <h2 className="text-lg font-semibold mb-3">Skills</h2>
                {skills.length === 0 ? (
                  <p className="text-sm text-gray-500">No skills yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {skills.map((sk) => (
                      <li
                        key={sk.id}
                        className="border border-gray-100 p-3 rounded-2xl bg-gray-50 flex justify-between items-center"
                      >
                        <div className="text-sm font-medium">
                          {sk.skill}
                        </div>
                        <div className="text-xs italic text-gray-600">
                          {sk.level}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Recommendations */}
              <section className="rounded-3xl border border-gray-200 bg-white shadow-sm px-5 py-5 md:px-6 md:py-6">
                <h2 className="text-lg font-semibold mb-3">Recommendations</h2>
                {recommendations.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No recommendations yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recommendations.map((r) => (
                      <blockquote
                        key={r.id}
                        className="border-l-4 border-gray-300 pl-4 py-2 bg-gray-50 rounded-2xl"
                      >
                        <p className="text-sm text-gray-700 italic">
                          “{r.content}”
                        </p>
                        {r.author && (
                          <p className="text-xs mt-1 text-gray-500">
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer"
            onClick={closeModal}
          />
          <div className="relative max-w-3xl w-full px-4 z-50">
            {selectedMedia.type === 'image' && (
              <img
                src={selectedMedia.url}
                className="w-full max-h-[90vh] object-contain rounded-2xl"
                alt=""
              />
            )}
            {selectedMedia.type === 'video' && (
              <video
                src={selectedMedia.url}
                controls
                className="w-full max-h-[90vh] rounded-2xl"
              />
            )}
            <button
              type="button"
              className="absolute top-2 right-2 text-white text-3xl font-bold"
              onClick={closeModal}
            >
              ×
            </button>
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
    <div className="flex-1 md:flex-none md:w-full border border-gray-200 rounded-2xl py-3 px-4 bg-gray-50 shadow-sm">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}
