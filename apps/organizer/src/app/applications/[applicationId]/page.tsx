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

      // 2) load gig
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
  if (error || !app) return <main className="p-6">{error ?? 'Failed to load application.'}</main>;

  const snap = app.profile_snapshot;
  const p = snap?.profile ?? null;
  const achievements = snap?.achievements ?? [];
  const shows = snap?.shows ?? [];
  const skills = snap?.skills ?? [];
  const recommendations = snap?.recommendations ?? [];
  const media = snap?.media ?? [];

  const canAct = app.status === 'pending';

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-xl font-semibold">Application Details</h1>

      {/* MUSICIAN HEADER */}
      <section className="border rounded-xl p-4 bg-gray-50 flex gap-3">
        <img
          src={p?.avatar_url ?? '/placeholder-avatar.png'}
          alt={p?.display_name ?? 'Musician'}
          className="w-14 h-14 rounded-full object-cover border"
        />
        <div className="flex-1">
          <div className="flex justify-between gap-2">
            <div>
              <p className="font-medium">
                {p?.display_name ?? 'Unknown musician'}
              </p>
              {p?.location && (
                <p className="text-xs text-gray-500">{p.location}</p>
              )}
            </div>
          </div>

          {p?.quote && (
            <blockquote className="mt-2 text-xs italic text-gray-700 border-l-2 pl-2">
              “{p.quote}”
            </blockquote>
          )}

          {p?.genres && p.genres.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {p.genres.map((g) => (
                <span
                  key={g}
                  className="px-2 py-0.5 rounded-full bg-white border text-[11px] text-gray-700"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ABOUT SUMMARY */}
      {p?.bio && (
        <section className="space-y-1">
          <h2 className="text-sm font-semibold text-gray-700">Bio</h2>
          <p className="text-sm text-gray-800 whitespace-pre-line">
            {p.bio}
          </p>
        </section>
      )}

      {/* Achievements + Shows (left) / Skills + Recommendations + Media (right) */}
      <section className="grid md:grid-cols-2 gap-6">
        {/* LEFT */}
        <div className="space-y-4">
          {/* Achievements */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700">
              Achievements
            </h3>
            {achievements.length === 0 ? (
              <p className="text-xs text-gray-500 mt-1">No achievements.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {achievements.map((a) => (
                  <li
                    key={a.id}
                    className="border rounded-md bg-gray-50 p-2"
                  >
                    <div className="text-xs font-medium">{a.title}</div>
                    {a.description && (
                      <div className="text-[11px] text-gray-700">
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
          <div>
            <h3 className="text-sm font-semibold text-gray-700">
              Recent Shows
            </h3>
            {shows.length === 0 ? (
              <p className="text-xs text-gray-500 mt-1">No shows listed.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {shows.map((s) => (
                  <li
                    key={s.id}
                    className="border rounded-md bg-gray-50 p-2"
                  >
                    <div className="text-xs font-medium">{s.title}</div>
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

        {/* RIGHT */}
        <div className="space-y-4">
          {/* Skills */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Skills</h3>
            {skills.length === 0 ? (
              <p className="text-xs text-gray-500 mt-1">No skills listed.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {skills.map((sk) => (
                  <li
                    key={sk.id}
                    className="border rounded-md bg-gray-50 p-2 flex justify-between items-center"
                  >
                    <span className="text-xs font-medium">
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
          <div>
            <h3 className="text-sm font-semibold text-gray-700">
              Recommendations
            </h3>
            {recommendations.length === 0 ? (
              <p className="text-xs text-gray-500 mt-1">
                No recommendations yet.
              </p>
            ) : (
              <div className="mt-1 space-y-2">
                {recommendations.map((r) => (
                  <blockquote
                    key={r.id}
                    className="border-l-2 pl-2 py-1 bg-gray-50 rounded-md"
                  >
                    <p className="text-xs text-gray-700 italic">
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

          {/* Media preview */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Media</h3>
            {media.length === 0 ? (
              <p className="text-xs text-gray-500 mt-1">No media.</p>
            ) : (
              <div className="mt-1 flex gap-2 flex-wrap">
                {media.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="w-16 h-16 rounded-md overflow-hidden bg-gray-200"
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
            )}
          </div>
        </div>
      </section>

      {/* APPLICATION MESSAGE */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700">Message</h2>
        <p className="mt-1 border rounded-xl p-3 text-sm text-gray-800 whitespace-pre-line">
          {app.message || 'No message provided.'}
        </p>
      </section>

      {/* STATUS */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700">Status</h2>
        <p className="mt-1 text-sm text-gray-800 capitalize">{app.status}</p>
      </section>

      {/* ACTIONS */}
      {canAct && (
        <section className="flex gap-3 pt-2">
          <button
            onClick={acceptApplication}
            disabled={saving}
            className="flex-1 bg-green-600 text-white py-2 rounded-xl text-sm disabled:opacity-60"
          >
            Accept &amp; create booking
          </button>
          <button
            onClick={declineApplication}
            disabled={saving}
            className="flex-1 bg-red-600 text-white py-2 rounded-xl text-sm disabled:opacity-60"
          >
            Decline
          </button>
        </section>
      )}
    </main>
  );
}
