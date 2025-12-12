'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';
import { sendNotification } from '@arteve/shared/notifications';

type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | string;

type SnapshotProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  genres: string[] | null;
  links: Record<string, string> | null;
  location: string | null;
  quote: string | null;
};

type Achievement = {
  id: string;
  title: string;
  description: string | null;
  year: number | null;
};

type Show = {
  id: string;
  title: string;
  venue: string | null;
  location: string | null;
  event_date: string | null;
};

type Skill = {
  id: string;
  skill: string;
  level: string | null;
};

type Recommendation = {
  id: string;
  author: string | null;
  content: string;
};

type MediaItem = {
  id: string;
  url: string;
  type: 'image' | 'video';
};

type ProfileSnapshot = {
  profile: SnapshotProfile | null;
  achievements: Achievement[];
  shows: Show[];
  skills: Skill[];
  recommendations: Recommendation[];
  media: MediaItem[];
};

type Application = {
  id: string;
  musician_id: string;
  gig_id: string;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
  profile_snapshot: ProfileSnapshot | null;
};

type Gig = {
  id: string;
  organizer_id: string;
  title: string | null;
  description: string | null;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  budget_min: number | null;
  budget_max: number | null;
};

export default function ApplicationDetailPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const router = useRouter();

  const [app, setApp] = useState<Application | null>(null);
  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!applicationId) return;

      setLoading(true);
      setError(null);

      // 1) load application with snapshot
      const { data: appRow, error: appErr } = await supabase
        .from('applications')
        .select(
          'id, musician_id, gig_id, message, status, created_at, profile_snapshot'
        )
        .eq('id', applicationId)
        .maybeSingle();

      if (appErr || !appRow) {
        console.error('Failed to load application:', appErr);
        setError('Failed to load application.');
        setLoading(false);
        return;
      }

      const snapshot = (appRow.profile_snapshot ?? null) as ProfileSnapshot | null;

      setApp({
        id: appRow.id,
        musician_id: appRow.musician_id,
        gig_id: appRow.gig_id,
        message: appRow.message,
        status: appRow.status as ApplicationStatus,
        created_at: appRow.created_at,
        profile_snapshot: snapshot,
      });

      // 2) load gig (for booking + notifications)
      const { data: gigRow, error: gigErr } = await supabase
        .from('gigs')
        .select(
          'id, organizer_id, title, description, event_date, event_time, location, budget_min, budget_max'
        )
        .eq('id', appRow.gig_id)
        .maybeSingle();

      if (gigErr || !gigRow) {
        console.error('Failed to load gig:', gigErr);
        setError('Failed to load related gig.');
        setLoading(false);
        return;
      }

      setGig(gigRow as Gig);
      setLoading(false);
    }

    load();
  }, [applicationId]);

  async function acceptApplication() {
    if (!app || !gig || saving) return;

    setSaving(true);

    // auth organizer
    const { data: auth } = await supabase.auth.getUser();
    const organizerUser = auth?.user;

    if (!organizerUser) {
      setError('You must be logged in to accept applications.');
      setSaving(false);
      return;
    }

    // optional organizer display name
    const { data: organizerProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', gig.organizer_id)
      .maybeSingle<{ display_name: string | null }>();

    // 1) update app status
    const { error: e1 } = await supabase
      .from('applications')
      .update({ status: 'accepted' })
      .eq('id', app.id);

    if (e1) {
      console.error('Error updating application status:', e1);
      setSaving(false);
      return;
    }

    // 2) create booking
    const eventDate =
      gig.event_date ?? new Date().toISOString().slice(0, 10);

    const {
      data: bookingRow,
      error: bookingErr,
    } = await supabase
      .from('bookings')
      .insert({
        musician_id: app.musician_id,
        organizer_id: organizerUser.id,
        organizer_name: organizerProfile?.display_name ?? null,
        organizer_email: organizerUser.email ?? null,
        event_title: gig.title ?? 'Gig booking',
        event_date: eventDate,
        location: gig.location,
        budget_min: gig.budget_min,
        budget_max: gig.budget_max,
        message: app.message,
        status: 'accepted',
        event_time: gig.event_time,
      })
      .select('id')
      .maybeSingle<{ id: string }>();

    if (bookingErr || !bookingRow) {
      console.error('Error creating booking:', bookingErr);
      setSaving(false);
      return;
    }

    const bookingId = bookingRow.id;

    // 3) mark gig booked
    await supabase
      .from('gigs')
      .update({ status: 'booked' })
      .eq('id', gig.id);

    // 4) reject all other pending apps
    await supabase
      .from('applications')
      .update({ status: 'rejected' })
      .eq('gig_id', gig.id)
      .eq('status', 'pending');

    // 5) update local UI
    setApp((prev) =>
      prev ? { ...prev, status: 'accepted' as ApplicationStatus } : prev
    );

    // 6) notify musician
    await sendNotification({
      userId: app.musician_id,
      type: 'application_status',
      title: 'Your application was accepted',
      body: gig.title
        ? `You were accepted for "${gig.title}".`
        : 'Your application was accepted.',
      entityType: 'booking',
      entityId: bookingId,
      data: {
        booking_id: bookingId,
        gig_id: app.gig_id,
        application_id: app.id,
      },
    });

    // 7) go to booking chat
    router.push(`/bookings/${bookingId}/chat`);
  }

  async function declineApplication() {
    if (!app || saving) return;

    setSaving(true);

    const { error: e1 } = await supabase
      .from('applications')
      .update({ status: 'rejected' })
      .eq('id', app.id);

    if (e1) {
      console.error('Error declining application:', e1);
      setSaving(false);
      return;
    }

    setApp((prev) =>
      prev ? { ...prev, status: 'rejected' as ApplicationStatus } : prev
    );

    // ensure we have gig for notification title
    let currentGig = gig;
    if (!currentGig) {
      const { data: gigRow } = await supabase
        .from('gigs')
        .select('id, title')
        .eq('id', app.gig_id)
        .maybeSingle<Gig>();

      currentGig = gigRow ?? null;
      setGig(currentGig);
    }

    await sendNotification({
      userId: app.musician_id,
      type: 'application_status',
      title: 'Your application was rejected',
      body: currentGig?.title
        ? `Your application for "${currentGig.title}" was rejected.`
        : 'Your application was rejected.',
      entityType: 'application',
      entityId: app.id,
      data: {
        gig_id: app.gig_id,
        application_id: app.id,
      },
    });

    setSaving(false);
  }

  if (loading) return <main className="p-6">Loading…</main>;
  if (error || !app) {
    return (
      <main className="p-6 text-sm text-red-600">
        {error ?? 'Failed to load application.'}
      </main>
    );
  }

  const snap = app.profile_snapshot;
  const p = snap?.profile ?? null;
  const achievements = snap?.achievements ?? [];
  const shows = snap?.shows ?? [];
  const skills = snap?.skills ?? [];
  const recommendations = snap?.recommendations ?? [];
  const media = snap?.media ?? [];

  const canAct = app.status === 'pending';

  const appliedDate = new Date(app.created_at).toLocaleString();

  const statusLabel =
    app.status === 'pending'
      ? 'Pending'
      : app.status === 'accepted'
      ? 'Accepted'
      : app.status === 'rejected'
      ? 'Rejected'
      : app.status;

  const statusClasses =
    app.status === 'pending'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : app.status === 'accepted'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : app.status === 'rejected'
      ? 'bg-rose-50 text-rose-800 border-rose-200'
      : 'bg-gray-50 text-gray-800 border-gray-200';

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      {/* PAGE TITLE */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Application details
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Applied on {appliedDate}
          </p>
        </div>

        <span
          className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium ${statusClasses}`}
        >
          {statusLabel}
        </span>
      </header>

      {/* MUSICIAN HEADER CARD */}
      <section className="rounded-3xl border border-gray-200 bg-white shadow-sm px-6 py-5 flex gap-4">
        <div className="flex-shrink-0">
          <img
            src={p?.avatar_url ?? '/placeholder-avatar.png'}
            alt={p?.display_name ?? 'Musician'}
            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border border-gray-200"
          />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
            <div>
              <p className="text-base md:text-lg font-semibold">
                {p?.display_name ?? 'Unknown musician'}
              </p>
              {p?.location && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {p.location}
                </p>
              )}
            </div>
          </div>

          {p?.quote && (
            <blockquote className="text-xs md:text-sm italic text-gray-700 border-l-2 border-gray-200 pl-3">
              “{p.quote}”
            </blockquote>
          )}

          {p?.genres && p.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {p.genres.map((g) => (
                <span
                  key={g}
                  className="px-2.5 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-[11px] text-gray-700"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* BIO + MESSAGE */}
      <section className="grid md:grid-cols-2 gap-6">
        {p?.bio && (
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm px-5 py-4 space-y-2">
            <h2 className="text-sm font-semibold text-gray-700">
              Bio
            </h2>
            <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
              {p.bio}
            </p>
          </div>
        )}

        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm px-5 py-4 space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">
            Application message
          </h2>
          <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
            {app.message || 'No message provided.'}
          </p>
        </div>
      </section>

      {/* SNAPSHOT GRID */}
      <section className="grid md:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Achievements */}
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Achievements
            </h3>
            {achievements.length === 0 ? (
              <p className="mt-1 text-xs text-gray-500">
                No achievements listed.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {achievements.map((a) => (
                  <li
                    key={a.id}
                    className="border border-gray-100 bg-gray-50 rounded-2xl px-3 py-2"
                  >
                    <div className="text-xs font-medium text-gray-900">
                      {a.title}
                    </div>
                    {a.description && (
                      <div className="text-[11px] text-gray-700 mt-0.5">
                        {a.description}
                      </div>
                    )}
                    {a.year && (
                      <div className="text-[10px] text-gray-500 mt-1">
                        {a.year}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Shows */}
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Recent shows
            </h3>
            {shows.length === 0 ? (
              <p className="mt-1 text-xs text-gray-500">
                No shows listed.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {shows.map((s) => (
                  <li
                    key={s.id}
                    className="border border-gray-100 bg-gray-50 rounded-2xl px-3 py-2"
                  >
                    <div className="text-xs font-medium text-gray-900">
                      {s.title}
                    </div>
                    <div className="text-[11px] text-gray-700">
                      {[s.venue, s.location].filter(Boolean).join(', ')}
                    </div>
                    {s.event_date && (
                      <div className="text-[10px] text-gray-500 mt-1">
                        {new Date(s.event_date).toLocaleDateString()}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Skills */}
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Skills
            </h3>
            {skills.length === 0 ? (
              <p className="mt-1 text-xs text-gray-500">
                No skills listed.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {skills.map((sk) => (
                  <li
                    key={sk.id}
                    className="border border-gray-100 bg-gray-50 rounded-2xl px-3 py-2 flex items-center justify-between"
                  >
                    <span className="text-xs font-medium text-gray-900">
                      {sk.skill}
                    </span>
                    {sk.level && (
                      <span className="text-[11px] italic text-gray-600">
                        {sk.level}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recommendations */}
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Recommendations
            </h3>
            {recommendations.length === 0 ? (
              <p className="mt-1 text-xs text-gray-500">
                No recommendations yet.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {recommendations.map((r) => (
                  <blockquote
                    key={r.id}
                    className="border-l-4 border-gray-200 bg-gray-50 rounded-2xl pl-3 pr-2 py-2"
                  >
                    <p className="text-xs text-gray-800 italic">
                      “{r.content}”
                    </p>
                    {r.author && (
                      <p className="text-[11px] text-gray-500 mt-1">
                        — {r.author}
                      </p>
                    )}
                  </blockquote>
                ))}
              </div>
            )}
          </div>

          {/* Media preview (kept minimal) */}
          {media.length > 0 && (
            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Media preview
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {media.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="w-16 h-16 rounded-xl overflow-hidden bg-gray-200"
                  >
                    {item.type === 'video' ? (
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={item.url}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    )}
                  </div>
                ))}
                {media.length > 3 && (
                  <span className="text-[11px] text-gray-500 flex items-center">
                    +{media.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* LINKS */}
      {p?.links && Object.keys(p.links).filter((k) => !!p.links?.[k]).length > 0 && (
        <section className="rounded-3xl border border-gray-200 bg-white shadow-sm px-5 py-4 space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Links</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(p.links)
              .filter(([, v]) => !!v)
              .map(([key, value]) => (
                <a
                  key={key}
                  href={value as string}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  {key}
                </a>
              ))}
          </div>
        </section>
      )}

      {/* ACTIONS */}
      <section className="pt-2 border-t border-gray-100 space-y-3">
        {!canAct && (
          <p className="text-xs text-gray-500">
            This application has already been {statusLabel.toLowerCase()}.
          </p>
        )}

        {canAct && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={acceptApplication}
              disabled={saving}
              className="flex-1 rounded-full bg-black text-white py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {saving ? 'Processing…' : 'Accept & create booking'}
            </button>
            <button
              onClick={declineApplication}
              disabled={saving}
              className="flex-1 rounded-full border border-gray-300 text-sm font-medium py-2.5 hover:bg-gray-50 disabled:opacity-60"
            >
              {saving ? 'Processing…' : 'Decline'}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
