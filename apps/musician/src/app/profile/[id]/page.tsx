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

/* ---------------------------------------------------------------------- */
/*  PUBLIC PROFILE PAGE                                                   */
/* ---------------------------------------------------------------------- */

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();

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

  /* -------------------------------------------- */
  /*  LOAD DATA                                   */
  /* -------------------------------------------- */
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        // 1) PROFILE
        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (pErr) throw pErr;
        if (!p) throw new Error('Profile not found');
        const prof = p as BaseProfile;
        setProfile(prof);

        // 2) ORGANIZER VIEW
        if (prof.role === 'organizer') {
          const { data: gigsData, error: gigsErr } = await supabase
            .from('gigs')
            .select('*')
            .eq('organizer_id', id)
            .order('created_at', { ascending: false });

          if (gigsErr) throw gigsErr;

          setOrganizerGigs((gigsData ?? []) as OrganizerGig[]);
          return;
        }

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
            .eq('profile_id', id)
            .not('media_url', 'is', null)
            .order('created_at', { ascending: false }),

          supabase
            .from('achievements')
            .select('*')
            .eq('profile_id', id)
            .order('created_at', { ascending: false }),

          supabase
            .from('shows')
            .select('*')
            .eq('profile_id', id)
            .order('event_date', { ascending: false }),

          supabase
            .from('skills')
            .select('*')
            .eq('profile_id', id)
            .order('created_at', { ascending: false }),

          supabase
            .from('recommendations')
            .select('*')
            .eq('profile_id', id)
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
  }, [id]);

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
                <p className="text-sm md:text-base">{profile.location}</p>
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
  const username =
    profile.display_name?.toLowerCase().replace(/\s+/g, '') ?? profile.id.slice(0, 8);

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

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-8 bg-white">

      {/* HEADER */}
      <section className="rounded-3xl border shadow-sm px-6 py-6 bg-white">
        <div className="flex flex-col md:flex-row gap-6">

          <div className="flex-shrink-0 flex justify-center md:block">
            <img
              src={profile.avatar_url ?? '/placeholder-avatar.png'}
              className="w-32 h-32 md:w-40 md:h-40 rounded-3xl object-cover border"
            />
          </div>

          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold">{profile.display_name}</h1>
              <p className="text-xs text-gray-500">@{username}</p>
            </div>

            {profile.location && (
              <p className="text-sm text-gray-500">{profile.location}</p>
            )}

            {genres.length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                {genres.map((g) => (
                  <span
                    key={g}
                    className="px-3 py-1 rounded-full bg-gray-100 text-xs"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {profile.bio && (
              <p className="text-sm md:text-base whitespace-pre-line">{profile.bio}</p>
            )}

            <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-1">
              <Link href={`/book/${profile.id}`} className="px-4 py-1.5 rounded-full bg-black text-white text-sm">
                Book
              </Link>
              <Link href={`/chat/${profile.id}`} className="px-4 py-1.5 rounded-full border text-sm">
                Message
              </Link>
              <button className="px-4 py-1.5 rounded-full border text-sm">Follow</button>
            </div>
          </div>
        </div>

        {profile.quote && (
          <div className="rounded-2xl bg-gray-50 px-4 py-3 mt-6">
            <p className="uppercase text-[11px] font-semibold text-gray-500">Artist quote</p>
            <p className="italic text-sm mt-1">“{profile.quote}”</p>
          </div>
        )}
      </section>

      {/* TABS */}
      <div className="flex gap-6 border-b pb-2">
        <button
          onClick={() => setActiveTab('media')}
          className={`pb-2 ${activeTab === 'media'
            ? 'border-b-2 border-black text-black'
            : 'text-gray-500'}`}
        >
          Media
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`pb-2 ${activeTab === 'about'
            ? 'border-b-2 border-black text-black'
            : 'text-gray-500'}`}
        >
          About
        </button>
      </div>

      {/* MEDIA TAB */}
      {activeTab === 'media' && (
        <section className="rounded-3xl border shadow-sm px-6 py-6 bg-white space-y-4">
          <h2 className="text-lg font-semibold">Media</h2>

          {posts.length === 0 ? (
            <p className="text-sm text-gray-500">No media uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {posts.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => openModal(i)}
                  className="relative pb-[100%] rounded-2xl overflow-hidden"
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
        <section>
          <section className="rounded-3xl border shadow-sm overflow-hidden bg-white">
            <div className="h-40 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 relative">
              {primaryMedia && primaryMedia.media_type === 'image' && (
                <img src={primaryMedia.media_url}
                  className="w-full h-full object-cover opacity-70" />
              )}
              <div className="absolute inset-0 bg-black/20" />
            </div>

            <div className="px-6 py-8 space-y-8">
              {profile.bio && (
                <div>
                  <h2 className="text-lg font-semibold">About</h2>
                  <p className="text-sm whitespace-pre-line">{profile.bio}</p>
                </div>
              )}

              {profile.links && Object.keys(profile.links).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700">Links</h3>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {Object.entries(profile.links)
                      .filter(([, v]) => v)
                      .map(([key, value]) => (
                        <a
                          key={key}
                          href={value as string}
                          target="_blank"
                          className="px-3 py-1 rounded-full border"
                        >
                          {key}
                        </a>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Achievements / Shows / Skills / Recommendations */}
          <div className="grid md:grid-cols-2 gap-6 mt-6">

            {/* Achievements */}
            <section className="rounded-3xl border shadow-sm px-5 py-5 bg-white">
              <h2 className="text-lg font-semibold mb-3">Achievements</h2>
              {achievements.length === 0 ? (
                <p className="text-sm text-gray-500">No achievements yet.</p>
              ) : (
                <ul className="space-y-2">
                  {achievements.map((a) => (
                    <li key={a.id} className="border p-3 rounded-2xl bg-gray-50">
                      <p className="font-medium">{a.title}</p>
                      {a.description && <p className="text-xs">{a.description}</p>}
                      {a.year && <p className="text-xs text-gray-500">{a.year}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Shows */}
            <section className="rounded-3xl border shadow-sm px-5 py-5 bg-white">
              <h2 className="text-lg font-semibold mb-3">Recent shows</h2>
              {shows.length === 0 ? (
                <p className="text-sm text-gray-500">No shows yet.</p>
              ) : (
                <ul className="space-y-2">
                  {shows.map((s) => (
                    <li key={s.id} className="border p-3 rounded-2xl bg-gray-50">
                      <p className="font-medium">{s.title}</p>
                      <p className="text-xs text-gray-700">
                        {[s.venue, s.location].filter(Boolean).join(', ')}
                      </p>
                      {s.event_date && (
                        <p className="text-[11px] text-gray-500">
                          {new Date(s.event_date).toLocaleDateString()}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Skills */}
            <section className="rounded-3xl border shadow-sm px-5 py-5 bg-white">
              <h2 className="text-lg font-semibold mb-3">Skills</h2>
              {skills.length === 0 ? (
                <p className="text-sm text-gray-500">No skills yet.</p>
              ) : (
                <ul className="space-y-2">
                  {skills.map((sk) => (
                    <li key={sk.id} className="border p-3 rounded-2xl bg-gray-50 flex justify-between">
                      <p>{sk.skill}</p>
                      <p className="text-xs italic text-gray-600">{sk.level}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Recommendations */}
            <section className="rounded-3xl border shadow-sm px-5 py-5 bg-white">
              <h2 className="text-lg font-semibold mb-3">Recommendations</h2>
              {recommendations.length === 0 ? (
                <p className="text-sm text-gray-500">No recommendations yet.</p>
              ) : (
                <div className="space-y-3">
                  {recommendations.map((r) => (
                    <blockquote key={r.id} className="border-l-4 pl-4 bg-gray-50 rounded-2xl py-2">
                      <p className="text-sm italic">“{r.content}”</p>
                      {r.author && (
                        <p className="text-xs text-gray-500">— {r.author}</p>
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <button onClick={closeModal} className="absolute inset-0" />
          <div className="relative max-w-3xl px-4">
            {selectedMedia.media_type === 'image' ? (
              <img
                src={selectedMedia.media_url}
                className="rounded-2xl max-h-[90vh]"
              />
            ) : (
              <video
                src={selectedMedia.media_url}
                controls
                className="rounded-2xl max-h-[90vh]"
              />
            )}

            <button
              className="absolute top-2 right-4 text-white text-3xl"
              onClick={closeModal}
            >
              ×
            </button>

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
