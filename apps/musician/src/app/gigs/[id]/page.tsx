'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import { useMarkNotificationAsRead } from '@arteve/shared/notifications/auto-read';

type GigStatus = 'open' | 'closed' | 'booked' | string;

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
  genres: string[] | null;
  status: GigStatus;
};

type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'declined' | string;

type Application = {
  id: string;
  gig_id: string;
  musician_id: string;
  message: string | null;
  status: ApplicationStatus;
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

export default function GigDetailPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const notifId = search.get('notification_id');

  const [gig, setGig] = useState<Gig | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);

  const [existingApp, setExistingApp] = useState<Application | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useMarkNotificationAsRead(notifId);

  // realtime gig status
  useEffect(() => {
    if (!gig) return;

    const channel = supabase
      .channel(`gig-status-${gig.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'gigs', filter: `id=eq.${gig.id}` },
        (payload) => setGig(payload.new as Gig)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gig?.id]);

  // load gig + musician profile + related tables + existing application
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // if not logged in, redirect to login
        // (or just show "please log in")
        setLoading(false);
        return;
      }

      setUserId(user.id);

      // gig
      const { data: g } = await supabase
        .from('gigs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (g) setGig(g as Gig);

      // profile
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (p) setProfile(p as Profile);

      // achievements
      const { data: a } = await supabase
        .from('achievements')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false });

      setAchievements((a ?? []) as Achievement[]);

      // shows
      const { data: s } = await supabase
        .from('shows')
        .select('*')
        .eq('profile_id', user.id)
        .order('event_date', { ascending: false });

      setShows((s ?? []) as Show[]);

      // skills
      const { data: sk } = await supabase
        .from('skills')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false });

      setSkills((sk ?? []) as Skill[]);

      // recommendations
      const { data: r } = await supabase
        .from('recommendations')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false });

      setRecommendations((r ?? []) as Recommendation[]);

      // media
      const { data: m } = await supabase
        .from('media')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false });

      setMedia((m ?? []) as MediaItem[]);

      // existing application
      const { data: apps } = await supabase
        .from('applications')
        .select('*')
        .eq('gig_id', id)
        .eq('musician_id', user.id)
        .limit(1);

      if (apps?.length) setExistingApp(apps[0] as Application);

      setLoading(false);
    }

    load();
  }, [id]);

  async function applyToGig() {
    if (!userId || !gig) return;
    if (!message.trim()) {
      setFeedback('Please include a message before applying.');
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    // refresh profile + related data before snapshot (to be safe)
    const { data: freshProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const { data: a } = await supabase
      .from('achievements')
      .select('*')
      .eq('profile_id', userId);

    const { data: s } = await supabase
      .from('shows')
      .select('*')
      .eq('profile_id', userId);

    const { data: sk } = await supabase
      .from('skills')
      .select('*')
      .eq('profile_id', userId);

    const { data: r } = await supabase
      .from('recommendations')
      .select('*')
      .eq('profile_id', userId);

    const { data: m } = await supabase
      .from('media')
      .select('*')
      .eq('profile_id', userId);

    const snapshot = {
      profile: freshProfile,
      achievements: a ?? [],
      shows: s ?? [],
      skills: sk ?? [],
      recommendations: r ?? [],
      media: m ?? [],
    };

    const { error } = await supabase.from('applications').insert({
      gig_id: gig.id,
      musician_id: userId,
      organizer_id: gig.organizer_id,
      message: message.trim(),
      status: 'pending',
      profile_snapshot: snapshot,
    });

    if (error) {
      console.error(error);
      setFeedback('Failed to submit application.');
    } else {
      setFeedback('Application submitted successfully.');
      setExistingApp({
        id: 'temp',
        gig_id: gig.id,
        musician_id: userId,
        message: message.trim(),
        status: 'pending',
      });
      setMessage('');
    }

    setSubmitting(false);
  }

  if (loading) return <main className="p-6">Loading gig…</main>;
  if (!gig) return <main className="p-6">Gig not found.</main>;

  const alreadyApplied = !!existingApp;
  const username =
    profile?.display_name?.toLowerCase().replace(/\s+/g, '') ??
    profile?.id?.slice(0, 8) ??
    'artist';

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-10">
      {/* GIG HEADER */}
      <section>
        <p className="text-xs text-gray-400">Gig ID: {gig.id.slice(0, 8)}…</p>
        <h1 className="text-2xl font-semibold">{gig.title ?? 'Untitled gig'}</h1>

        {gig.location && <p className="text-sm text-gray-600">{gig.location}</p>}

        {(gig.event_date || gig.event_time) && (
          <p className="text-sm text-gray-600">
            {gig.event_date &&
              new Date(gig.event_date).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            {gig.event_time && ` · ${gig.event_time}`}
          </p>
        )}

        {(gig.budget_min !== null || gig.budget_max !== null) && (
          <p className="text-sm text-gray-600">
            Budget:{' '}
            {gig.budget_min !== null ? `$${gig.budget_min}` : 'TBD'}
            {gig.budget_max !== null ? ` – $${gig.budget_max}` : ''}
          </p>
        )}

        {gig.genres && gig.genres.length > 0 && (
          <p className="text-sm text-gray-600">
            Genres: {gig.genres.join(', ')}
          </p>
        )}
      </section>

      {/* PROFILE SUMMARY (Option 1) */}
      {profile && (
        <section className="space-y-4 p-4 border rounded-2xl bg-gray-50">
          <div className="flex justify-between items-start gap-3">
            <div className="flex gap-3">
              <img
                src={profile.avatar_url ?? '/placeholder-avatar.png'}
                alt="Avatar"
                className="w-14 h-14 rounded-full object-cover border"
              />
              <div>
                <h2 className="font-semibold text-lg">
                  {profile.display_name ?? 'Unnamed artist'}
                </h2>
                <p className="text-xs text-gray-500">@{username}</p>
                {profile.location && (
                  <p className="text-xs text-gray-500 mt-1">
                    {profile.location}
                  </p>
                )}
              </div>
            </div>

            <Link
              href="/profile/edit"
              className="text-xs text-blue-600 underline"
            >
              Edit profile
            </Link>
          </div>

          {profile.quote && (
            <blockquote className="text-sm italic text-gray-800 border-l-4 pl-3">
              “{profile.quote}”
            </blockquote>
          )}

          {profile.genres && profile.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {profile.genres.map((g) => (
                <span
                  key={g}
                  className="px-2 py-0.5 rounded-full bg-white text-xs border text-gray-700"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {profile.bio && (
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-gray-600">Bio</h3>
              <p className="text-sm text-gray-800 whitespace-pre-line">
                {profile.bio}
              </p>
            </div>
          )}

          {/* ACHIEVEMENTS */}
          {achievements.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-gray-600">
                Achievements
              </h3>
              <ul className="space-y-1 text-sm text-gray-800">
                {achievements.slice(0, 3).map((a) => (
                  <li key={a.id}>
                    <span className="font-medium">{a.title}</span>
                    {a.year && (
                      <span className="text-xs text-gray-500"> · {a.year}</span>
                    )}
                    {a.description && (
                      <div className="text-xs text-gray-700">
                        {a.description}
                      </div>
                    )}
                  </li>
                ))}
                {achievements.length > 3 && (
                  <li className="text-xs text-gray-500">
                    +{achievements.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* SKILLS */}
          {skills.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-gray-600">Skills</h3>
              <div className="flex flex-wrap gap-1">
                {skills.slice(0, 6).map((sk) => (
                  <span
                    key={sk.id}
                    className="px-2 py-0.5 rounded-full bg-white text-xs border text-gray-700"
                  >
                    {sk.skill}
                    {sk.level && <span className="text-[10px]"> · {sk.level}</span>}
                  </span>
                ))}
                {skills.length > 6 && (
                  <span className="text-xs text-gray-500">
                    +{skills.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* RECENT SHOWS */}
          {shows.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-gray-600">
                Recent Shows
              </h3>
              <ul className="space-y-1 text-sm text-gray-800">
                {shows.slice(0, 3).map((s) => (
                  <li key={s.id}>
                    <span className="font-medium">{s.title}</span>
                    <span className="text-xs text-gray-500">
                      {' '}
                      · {[s.venue, s.location].filter(Boolean).join(', ')}
                    </span>
                    {s.event_date && (
                      <div className="text-[11px] text-gray-500">
                        {new Date(s.event_date).toLocaleDateString()}
                      </div>
                    )}
                  </li>
                ))}
                {shows.length > 3 && (
                  <li className="text-xs text-gray-500">
                    +{shows.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* RECOMMENDATIONS */}
          {recommendations.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-gray-600">
                Recommendations
              </h3>
              <div className="space-y-2">
                {recommendations.slice(0, 2).map((r) => (
                  <blockquote
                    key={r.id}
                    className="text-xs text-gray-700 border-l-2 pl-2 italic"
                  >
                    “{r.content}”
                    {r.author && (
                      <span className="not-italic text-[11px] text-gray-500">
                        {' '}
                        — {r.author}
                      </span>
                    )}
                  </blockquote>
                ))}
                {recommendations.length > 2 && (
                  <p className="text-[11px] text-gray-500">
                    +{recommendations.length - 2} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* MEDIA PREVIEW */}
          {media.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-gray-600">
                Media preview
              </h3>
              <div className="flex gap-2">
                {media.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="w-20 h-20 rounded-md overflow-hidden bg-gray-200"
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
                  <div className="flex items-center text-[11px] text-gray-500">
                    +{media.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LINKS */}
          {profile.links && Object.keys(profile.links).length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-gray-600">Links</h3>
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(profile.links)
                  .filter(([, v]) => !!v)
                  .map(([key, value]) => (
                    <a
                      key={key}
                      href={value as string}
                      target="_blank"
                      className="underline text-blue-600"
                    >
                      {key}
                    </a>
                  ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* APPLICATION FORM */}
      <section className="space-y-3 border-t pt-4">
        <h2 className="font-medium">Apply to this gig</h2>

        {alreadyApplied && (
          <p className="text-sm text-blue-600">
            You already applied ({existingApp.status}).
          </p>
        )}

        {feedback && <p className="text-sm text-gray-700">{feedback}</p>}

        {gig.status !== 'open' && (
          <p className="text-sm text-gray-500">
            This gig is no longer accepting applications.
          </p>
        )}

        {!alreadyApplied && gig.status === 'open' && (
          <>
            <textarea
              className="w-full border rounded-xl p-3 text-sm min-h-[140px]"
              placeholder="Write a short message to the organizer (why you're a good fit, any extra details)…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <button
              onClick={applyToGig}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm disabled:opacity-60"
            >
              {submitting ? 'Sending…' : 'Apply'}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
