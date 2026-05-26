'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';
import { RatingDisplay, ReviewList } from '@arteve/shared/reviews';

type VenueProfile = {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  venue_photos: string[] | null;
  links: Record<string, string> | null;
};

type Gig = {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  genres: string[] | null;
  status: string;
};

export default function WhatsOnVenuePage() {
  const { venue } = useParams<{ venue: string }>();
  const [profile, setProfile] = useState<VenueProfile | null>(null);
  const [upcoming, setUpcoming] = useState<Gig[]>([]);
  const [past, setPast] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Look up venue by handle
      const { data: p } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url, bio, location, venue_photos, links')
        .eq('handle', venue)
        .eq('role', 'organizer')
        .maybeSingle();

      if (!p) {
        setLoading(false);
        return;
      }

      setProfile(p as VenueProfile);

      const today = new Date().toISOString().slice(0, 10);
      const { data: gigs } = await supabase
        .from('gigs')
        .select('id, title, description, event_date, event_time, location, budget_min, budget_max, genres, status')
        .eq('organizer_id', p.id)
        .order('event_date', { ascending: true });

      const upcomingList = (gigs ?? []).filter(
        (g) => g.event_date && g.event_date >= today,
      );
      const pastList = (gigs ?? [])
        .filter((g) => g.event_date && g.event_date < today)
        .reverse();

      setUpcoming(upcomingList as Gig[]);
      setPast(pastList as Gig[]);
      setLoading(false);
    })();
  }, [venue]);

  if (loading) return (
    <main className="page page-narrow">
      <div className="card card-padded flex items-center gap-3"><span className="inline-block h-4 w-4 rounded-full border-2 border-brand border-r-transparent animate-spin" /><p className="text-sm text-ink-muted">Loading venue…</p></div>
    </main>
  );
  if (!profile) return <main className="p-10 text-center text-ink-subtle">Venue not found.</main>;

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      {/* HERO */}
      <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        {profile.venue_photos?.[0] && (
          <img
            src={profile.venue_photos[0]}
            alt={profile.display_name ?? 'Venue photo'}
            className="h-56 w-full object-cover sm:h-72"
          />
        )}
        <div className="p-6 space-y-3">
          <div className="flex items-start gap-4">
            <img
              src={profile.avatar_url ?? '/placeholder-avatar.png'}
              alt=""
              className="h-16 w-16 rounded-full border border-line object-cover"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-ink-strong">
                {profile.display_name}
              </h1>
              <p className="text-sm text-ink-subtle">@{profile.handle}</p>
              {profile.location && (
                <p className="mt-1 text-sm text-ink">{profile.location}</p>
              )}
              <div className="mt-2">
                <RatingDisplay profileId={profile.id} variant="inline" />
              </div>
            </div>
          </div>

          {profile.bio && (
            <p className="text-sm leading-relaxed text-ink">{profile.bio}</p>
          )}

          {profile.links && Object.keys(profile.links).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.entries(profile.links)
                .filter(([, v]) => !!v)
                .map(([k, v]) => (
                  <a
                    key={k}
                    href={v as string}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-line-strong px-3 py-1 text-xs text-ink hover:bg-surface-sunken"
                  >
                    {k}
                  </a>
                ))}
            </div>
          )}
        </div>
      </section>

      {/* PHOTOS GRID */}
      {profile.venue_photos && profile.venue_photos.length > 1 && (
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {profile.venue_photos.slice(1).map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              className="aspect-[4/3] w-full rounded-2xl object-cover"
            />
          ))}
        </section>
      )}

      {/* UPCOMING */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink-strong">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong bg-surface-sunken px-5 py-8 text-center text-sm text-ink-subtle">
            Nothing on the books just yet. Check back soon.
          </div>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((g) => (
              <li
                key={g.id}
                className="rounded-2xl border border-line bg-surface p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-strong">{g.title}</p>
                    <p className="text-sm text-ink-muted">
                      {g.event_date && new Date(g.event_date).toLocaleDateString(undefined, {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                      })}
                      {g.event_time && ` · ${g.event_time.slice(0, 5)}`}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
                    g.status === 'open'   ? 'bg-emerald-100 text-emerald-800' :
                    g.status === 'booked' ? 'bg-blue-100 text-blue-800' :
                    'bg-line-strong text-ink'
                  }`}>
                    {g.status}
                  </span>
                </div>
                {g.description && (
                  <p className="mt-2 text-sm text-ink">{g.description}</p>
                )}
                {g.genres && g.genres.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {g.genres.map((gg) => (
                      <span key={gg} className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] text-ink">
                        {gg}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* PAST */}
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink-strong">Past shows</h2>
          <ul className="space-y-2">
            {past.slice(0, 10).map((g) => (
              <li
                key={g.id}
                className="rounded-xl border border-line bg-surface px-4 py-3 text-sm"
              >
                <span className="font-medium text-ink-strong">{g.title}</span>
                <span className="ml-2 text-ink-subtle">
                  {g.event_date && new Date(g.event_date).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* REVIEWS */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink-strong">Reviews</h2>
        <ReviewList profileId={profile.id} limit={6} />
      </section>
    </main>
  );
}
