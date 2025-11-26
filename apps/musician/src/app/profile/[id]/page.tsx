'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';

/* ----------------------------- Shared Types ----------------------------- */

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

type BaseProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  genres: string[] | null;
  links: Record<string, string> | null;
  location: string | null;
  quote: string | null;
  stats_posts?: number | null;
  stats_followers?: number | null;
  stats_following?: number | null;
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
/* MAIN WRAPPER: decide musician vs organizer based on profile.role       */
/* ---------------------------------------------------------------------- */

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();

  const [profile, setProfile] = useState<BaseProfile | null>(null);

  // musician-related data
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  // organizer-related data
  const [organizerGigs, setOrganizerGigs] = useState<OrganizerGig[]>([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // modal state for musician media
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // modal state for venue photo
  const [venueModalUrl, setVenueModalUrl] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'media' | 'about'>('media');

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        // 1) PROFILE (always)
        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select(`
            id,
            created_at,
            display_name,
            avatar_url,
            role,
            bio,
            location,
            genres,
            links,
            quote,
            venue_photos,
            achievements,
            skills,
            recent_shows,
            recommendations,
            spotlight
          `)
          .eq('id', id)
          .maybeSingle();

        if (pErr) throw pErr;
        if (!p) throw new Error('Profile not found');
        const prof = p as BaseProfile;
        setProfile(prof);

        // 2) Branch on role
        if (prof.role === 'organizer') {
          // Organizer / venue profile

          const { data: gigsData, error: gigsErr } = await supabase
            .from('gigs')
            .select(
              `
              id,
              title,
              event_date,
              location,
              status,
              budget_min,
              budget_max,
              created_at
            `
            )
            .eq('organizer_id', prof.id)
            .order('created_at', { ascending: false });

          if (gigsErr) throw gigsErr;

          setOrganizerGigs((gigsData ?? []) as OrganizerGig[]);
        } else {
          // Musician profile (default if role is null or 'musician')

          const [{ data: m }, { data: a }, { data: s }, { data: sk }, { data: r }] =
            await Promise.all([
              supabase
                .from('media')
                .select('*')
                .eq('profile_id', id)
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

          setMedia((m ?? []) as MediaItem[]);
          setAchievements((a ?? []) as Achievement[]);
          setShows((s ?? []) as Show[]);
          setSkills((sk ?? []) as Skill[]);
          setRecommendations((r ?? []) as Recommendation[]);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ESC to close musician media modal
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

  if (loading) return <main className="p-6">Loading profile…</main>;
  if (err || !profile)
    return <main className="p-6 text-red-600">Error: {err}</main>;

  const isOrganizer = profile.role === 'organizer';

  // -------------------- ORGANIZER / VENUE VIEW -------------------- //
  if (isOrganizer) {
    const venuePhotos = profile.venue_photos ?? [];
    const primaryVenuePhoto = venuePhotos[0] ?? null;

    return (
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8 bg-white">
        {/* HERO / HEADER */}
        <section className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Hero banner */}
          <div className="h-48 md:h-64 w-full bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 relative">
            {primaryVenuePhoto && (
              <img
                src={primaryVenuePhoto}
                alt={profile.display_name ?? 'Venue'}
                className="w-full h-full object-cover opacity-70"
              />
            )}
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute bottom-5 left-5 right-5 md:left-10 md:bottom-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="space-y-1 text-white">
                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
                  {profile.display_name ?? 'Venue'}
                </h1>
                {profile.location && (
                  <p className="text-sm md:text-base text-gray-100">
                    {profile.location}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/chat/${profile.id}`}
                  className="px-4 py-2 rounded-full bg-white text-sm font-medium text-gray-900"
                >
                  Message venue
                </Link>
                <a
                  href="#venue-gigs"
                  className="px-4 py-2 rounded-full border border-white/70 text-sm font-medium text-white"
                >
                  View gigs
                </a>
              </div>
            </div>
          </div>

          {/* Summary under banner */}
          <div className="px-6 py-6 md:px-10 md:py-8 space-y-4">
            {profile.bio && (
              <p className="text-sm md:text-base text-gray-800 leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Links */}
            {profile.links && Object.keys(profile.links).length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-gray-700">
                  Online presence
                </h2>
                <div className="flex flex-wrap gap-3 text-xs md:text-sm">
                  {Object.entries(profile.links)
                    .filter(([, v]) => v)
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

        {/* VENUE PHOTOS */}
        <section className="rounded-3xl border border-gray-200 bg-white shadow-sm px-5 py-5 md:px-8 md:py-7 space-y-4">
          <div>
            <h2 className="text-lg md:text-xl font-semibold tracking-tight">
              Venue photos
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              A peek inside the space — stage, crowd, and vibe.
            </p>
          </div>

          {venuePhotos.length === 0 ? (
            <div className="border border-dashed rounded-2xl py-10 flex flex-col items-center justify-center text-center bg-gray-50">
              <p className="text-sm text-gray-600">
                No photos uploaded yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {venuePhotos.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setVenueModalUrl(url)}
                  className="relative w-full pb-[75%] bg-gray-100 overflow-hidden rounded-2xl hover:opacity-90 transition"
                >
                  <img
                    src={url}
                    alt="Venue photo"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* GIGS FROM THIS ORGANIZER */}
        <section
          id="venue-gigs"
          className="rounded-3xl border border-gray-200 bg-white shadow-sm px-5 py-5 md:px-8 md:py-7 space-y-4"
        >
          <div>
            <h2 className="text-lg md:text-xl font-semibold tracking-tight">
              Gigs from this organizer
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Active and past opportunities listed by this venue.
            </p>
          </div>

          {organizerGigs.length === 0 ? (
            <p className="text-sm text-gray-500">
              No gigs posted yet.
            </p>
          ) : (
            <div className="space-y-3">
              {organizerGigs.map((gig) => (
                <Link
                  key={gig.id}
                  href={`/gigs/${gig.id}`}
                  className="block border rounded-2xl px-4 py-3 hover:bg-gray-50 transition"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="font-medium text-sm md:text-base">
                        {gig.title ?? 'Untitled gig'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {gig.event_date
                          ? new Date(gig.event_date).toLocaleDateString(
                              undefined,
                              {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              }
                            )
                          : 'Date TBD'}
                        {gig.location ? ` · ${gig.location}` : ''}
                      </p>
                      {(gig.budget_min !== null ||
                        gig.budget_max !== null) && (
                        <p className="text-xs text-gray-500 mt-1">
                          Budget:{' '}
                          {gig.budget_min !== null
                            ? `$${gig.budget_min}`
                            : 'TBD'}
                          {gig.budget_max !== null
                            ? ` – $${gig.budget_max}`
                            : ''}
                        </p>
                      )}
                    </div>

                    <span
                      className={`text-[11px] px-2 py-1 rounded-full ${
                        gig.status === 'open'
                          ? 'bg-green-100 text-green-800'
                          : gig.status === 'booked'
                          ? 'bg-amber-100 text-amber-800'
                          : gig.status === 'closed'
                          ? 'bg-gray-200 text-gray-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {gig.status === 'open'
                        ? 'Open for applications'
                        : gig.status === 'booked'
                        ? 'Booked'
                        : gig.status === 'closed'
                        ? 'Closed'
                        : gig.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* VENUE PHOTO MODAL */}
        {venueModalUrl && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <button
              onClick={() => setVenueModalUrl(null)}
              className="absolute inset-0 cursor-pointer"
            />
            <div className="relative max-w-3xl w-full px-4 z-50">
              <img
                src={venueModalUrl}
                className="w-full max-h-[90vh] object-contain rounded-2xl"
                alt=""
              />
              <button
                className="absolute top-2 right-3 text-white text-3xl font-bold"
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

  // -------------------- MUSICIAN VIEW (EXISTING UI) -------------------- //

  const primaryMedia = media[0];
  const genres = Array.isArray(profile.genres) ? profile.genres : [];

  const username =
    profile.display_name?.toLowerCase().replace(/\s+/g, '') ??
    profile.id.slice(0, 8);

  function openModal(i: number) {
    setSelectedIndex(i);
    setSelectedMedia(media[i]);
  }
  function closeModal() {
    setSelectedMedia(null);
  }
  function showNext() {
    const nextIndex = (selectedIndex + 1) % media.length;
    setSelectedIndex(nextIndex);
    setSelectedMedia(media[nextIndex]);
  }
  function showPrev() {
    const prevIndex = (selectedIndex - 1 + media.length) % media.length;
    setSelectedIndex(prevIndex);
    setSelectedMedia(media[prevIndex]);
  }

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
                {profile.display_name}
              </h1>
              <p className="text-xs md:text-sm text-gray-500">@{username}</p>
            </div>

            {profile.location && (
              <p className="text-sm text-gray-500">{profile.location}</p>
            )}
            {genres.length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                {genres.map((g) => (
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
              <Link
                href={`/book/${profile.id}`}
                className="px-4 py-1.5 rounded-full bg-black text-white text-sm"
              >
                Book
              </Link>
              <Link
                href={`/chat/${profile.id}`}
                className="px-4 py-1.5 rounded-full border text-sm"
              >
                Message
              </Link>
              <button className="px-4 py-1.5 rounded-full border text-sm">
                Follow
              </button>
            </div>
          </div>

          {/* Stats */}
          <aside className="w-full md:w-56 flex md:flex-col justify-around md:justify-start gap-4 md:gap-3 text-center">
            <StatBlock label="Posts" value={profile.stats_posts ?? 0} />
            <StatBlock label="Followers" value={profile.stats_followers ?? 0} />
            <StatBlock label="Following" value={profile.stats_following ?? 0} />
          </aside>
        </div>

        {/* Artist quote */}
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
          <div>
            <h2 className="text-lg md:text-xl font-semibold tracking-tight">
              Media
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Photos and videos uploaded by the artist.
            </p>
          </div>

          {media.length === 0 ? (
            <div className="border border-dashed rounded-2xl py-10 flex flex-col items-center justify-center text-center bg-gray-50">
              <p className="text-sm text-gray-600">
                No media uploaded yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              {media.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openModal(idx)}
                  className="relative w-full pb-[100%] bg-gray-100 overflow-hidden rounded-2xl cursor-pointer hover:opacity-90 transition"
                >
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      className="absolute inset-0 w-full h-full object-cover"
                      alt=""
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
          {/* ABOUT CARD */}
          <section className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Banner */}
            <div className="h-40 md:h-52 w-full bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 relative">
              {primaryMedia?.type === 'image' && (
                <img
                  src={primaryMedia.url}
                  alt=""
                  className="w-full h-full object-cover opacity-70"
                />
              )}
              <div className="absolute inset-0 bg-black/20"></div>
            </div>

            <div className="px-5 py-6 md:px-8 md:py-8 space-y-8">
              {profile.bio && (
                <div className="space-y-1">
                  <h2 className="text-lg md:text-xl font-semibold tracking-tight">
                    About
                  </h2>
                  <p className="text-sm md:text-base text-gray-800 leading-relaxed whitespace-pre-line">
                    {profile.bio}
                  </p>
                </div>
              )}

              {profile.links && Object.keys(profile.links).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700">Links</h3>
                  <div className="flex flex-wrap gap-3 text-xs md:text-sm">
                    {Object.entries(profile.links)
                      .filter(([, v]) => v)
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

          {/* CONTENT GRID */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* LEFT */}
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
                        <p className="font-medium text-sm">{a.title}</p>
                        {a.description && (
                          <p className="text-xs text-gray-700">{a.description}</p>
                        )}
                        {a.year && (
                          <p className="text-xs text-gray-500 mt-1">{a.year}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Shows */}
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
                        <p className="font-medium text-sm">{s.title}</p>
                        <p className="text-xs text-gray-700">
                          {[s.venue, s.location].filter(Boolean).join(', ')}
                        </p>
                        {s.event_date && (
                          <p className="text-[11px] text-gray-500 mt-1">
                            {new Date(s.event_date).toLocaleDateString()}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* RIGHT */}
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
                        <p className="text-sm font-medium">{sk.skill}</p>
                        <p className="text-xs italic text-gray-600">{sk.level}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Recommendations */}
              <section className="rounded-3xl border border-gray-200 bg-white shadow-sm px-5 py-5 md:px-6 md:py-6">
                <h2 className="text-lg font-semibold mb-3">Recommendations</h2>
                {recommendations.length === 0 ? (
                  <p className="text-sm text-gray-500">No recommendations yet.</p>
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
            onClick={closeModal}
            className="absolute inset-0 cursor-pointer"
          />
          <div className="relative max-w-3xl w-full px-4 z-50">
            {selectedMedia.type === 'image' ? (
              <img
                src={selectedMedia.url}
                className="w-full max-h-[90vh] object-contain rounded-2xl"
                alt=""
              />
            ) : (
              <video
                src={selectedMedia.url}
                controls
                className="w-full max-h-[90vh] rounded-2xl"
              />
            )}

            <button
              className="absolute top-2 right-2 text-white text-3xl font-bold"
              onClick={closeModal}
            >
              ×
            </button>

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

/* ---------------------------------------- */
/* STATS BLOCK (same as private profile)    */
/* ---------------------------------------- */
function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 md:flex-none md:w-full border border-gray-200 rounded-2xl py-3 px-4 bg-gray-50 shadow-sm">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}
