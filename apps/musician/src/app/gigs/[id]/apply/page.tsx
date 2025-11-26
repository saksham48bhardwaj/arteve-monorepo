'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';

type Gig = {
  id: string;
  title: string | null;
  status: string;
  organizer_id: string;
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

export default function ApplyToGigPage() {
  const { id } = useParams<{ id: string }>();

  const [gig, setGig] = useState<Gig | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Load gig + profile snapshot data
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setUserId(user.id);

      const { data: g } = await supabase
        .from('gigs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (g) setGig(g as Gig);

      // Profile + sections
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (p) setProfile(p as Profile);

      const { data: a } = await supabase
        .from('achievements')
        .select('*')
        .eq('profile_id', user.id);

      setAchievements(a ?? []);

      const { data: s } = await supabase
        .from('shows')
        .select('*')
        .eq('profile_id', user.id);

      setShows(s ?? []);

      const { data: sk } = await supabase
        .from('skills')
        .select('*')
        .eq('profile_id', user.id);

      setSkills(sk ?? []);

      const { data: r } = await supabase
        .from('recommendations')
        .select('*')
        .eq('profile_id', user.id);

      setRecommendations(r ?? []);
    }

    load();
  }, [id]);

  async function submitApplication() {
    if (!message.trim()) {
      setFeedback('Please write a message before submitting.');
      return;
    }
    if (!userId || !gig) return;

    setSubmitting(true);
    setFeedback(null);

    // Snapshot logic
    const snapshot = {
      profile,
      achievements,
      shows,
      skills,
      recommendations,
      media: [], // intentionally empty per your request
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
      setMessage('');
    }

    setSubmitting(false);
  }

  if (!gig || !profile)
    return <main className="p-6">Loading application page…</main>;

  const username =
    profile.display_name?.toLowerCase().replace(/\s+/g, '') ??
    profile.id.slice(0, 8);

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-10 bg-white">

      {/* ================================
          HEADER
      ================================= */}
      <h1 className="text-2xl font-semibold tracking-tight">
        Apply to: {gig.title ?? 'Gig'}
      </h1>

      {/* ================================
          SNAPSHOT CARD
      ================================= */}
      <section className="rounded-3xl border border-gray-200 bg-white shadow-sm px-6 py-8 space-y-6">

        {/* Top — Avatar + Name */}
        <div className="flex gap-4">
          <img
            src={profile.avatar_url ?? '/placeholder-avatar.png'}
            className="w-20 h-20 rounded-2xl object-cover border"
          />
          <div className="flex-1 space-y-1">
            <h2 className="text-xl font-semibold">
              {profile.display_name ?? 'Unnamed artist'}
            </h2>
            <p className="text-xs text-gray-500">@{username}</p>
            {profile.location && (
              <p className="text-sm text-gray-600">{profile.location}</p>
            )}
          </div>
        </div>

        {/* Genres */}
        {profile.genres && profile.genres.length > 0 && (
          <div className="flex flex-wrap gap-2">
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

        {/* Quote */}
        {profile.quote && (
          <blockquote className="italic text-gray-700 text-sm border-l-4 pl-3">
            “{profile.quote}”
          </blockquote>
        )}

        {/* Bio */}
        {profile.bio && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700">Bio</h3>
            <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
              {profile.bio}
            </p>
          </section>
        )}

        {/* Achievements */}
        {achievements.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700">
              Achievements
            </h3>
            <ul className="space-y-2 mt-1">
              {achievements.map((a) => (
                <li
                  key={a.id}
                  className="border border-gray-100 bg-gray-50 p-3 rounded-2xl"
                >
                  <p className="text-sm font-medium">{a.title}</p>
                  {a.description && (
                    <p className="text-xs text-gray-700">{a.description}</p>
                  )}
                  {a.year && (
                    <p className="text-xs text-gray-500">{a.year}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Shows */}
        {shows.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700">Recent Shows</h3>
            <ul className="space-y-2 mt-1">
              {shows.map((s) => (
                <li
                  key={s.id}
                  className="border border-gray-100 bg-gray-50 p-3 rounded-2xl"
                >
                  <p className="text-sm font-medium">{s.title}</p>
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
          </section>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700">Skills</h3>
            <ul className="space-y-2 mt-1">
              {skills.map((sk) => (
                <li
                  key={sk.id}
                  className="border border-gray-100 bg-gray-50 p-3 rounded-2xl flex justify-between"
                >
                  <span className="text-sm font-medium">{sk.skill}</span>
                  {sk.level && (
                    <span className="text-xs italic text-gray-600">
                      {sk.level}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700">
              Recommendations
            </h3>
            <div className="space-y-2 mt-1">
              {recommendations.map((r) => (
                <blockquote
                  key={r.id}
                  className="border-l-4 border-gray-300 pl-4 py-2 bg-gray-50 rounded-2xl text-sm italic text-gray-700"
                >
                  “{r.content}”
                  {r.author && (
                    <p className="not-italic text-xs mt-1 text-gray-500">
                      — {r.author}
                    </p>
                  )}
                </blockquote>
              ))}
            </div>
          </section>
        )}

        {/* Links */}
        {profile.links && Object.keys(profile.links).length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700">Links</h3>
            <div className="flex flex-wrap gap-3 text-xs mt-1">
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
          </section>
        )}
      </section>

      {/* ================================
          APPLICATION FORM
      ================================= */}
      <section className="rounded-3xl border border-gray-200 bg-white shadow-sm px-6 py-8 space-y-4">
        <h2 className="text-lg font-semibold">Write your application</h2>

        {feedback && (
          <p className="text-sm text-gray-600">{feedback}</p>
        )}

        <textarea
          className="w-full border rounded-2xl p-4 text-sm min-h-[140px] bg-gray-50"
          placeholder="Write a short message to the organizer…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <button
          onClick={submitApplication}
          disabled={submitting}
          className="px-6 py-2 rounded-full bg-black text-white text-sm disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Application'}
        </button>
      </section>
    </main>
  );
}
