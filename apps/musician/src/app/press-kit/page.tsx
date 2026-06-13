'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';

type Profile = {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  genres: string[] | null;
  links: Record<string, string> | null;
  quote: string | null;
};

type Achievement = { id: string; title: string | null; year: number | null };
type Show = { id: string; title: string | null; venue: string | null; location: string | null; event_date: string | null };
type Skill = { id: string; skill: string | null; level: string | null };
type ReviewLite = { id: string; rating: number; comment: string | null; reviewer: { display_name: string | null } | null };

/**
 * Press-kit page rendered with print-friendly CSS.
 * Click "Download as PDF" → triggers window.print() which uses the
 * browser's native "Save as PDF" destination. No extra dependencies.
 */
export default function PressKitPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [reviews, setReviews] = useState<ReviewLite[]>([]);
  const [rating, setRating] = useState<{ avg_rating: number; review_count: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) {
        router.push('/login');
        return;
      }

      const [p, a, s, sk, r, rate] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
        supabase.from('achievements').select('id, title, year').eq('profile_id', uid).order('year', { ascending: false }),
        supabase.from('shows').select('id, title, venue, location, event_date').eq('profile_id', uid).order('event_date', { ascending: false }),
        supabase.from('skills').select('id, skill, level').eq('profile_id', uid),
        supabase
          .from('reviews')
          .select('id, rating, comment, reviewer:profiles!reviewer_id(display_name)')
          .eq('reviewee_id', uid)
          .order('created_at', { ascending: false })
          .limit(6),
        supabase.from('profile_ratings').select('*').eq('profile_id', uid).maybeSingle(),
      ]);

      setProfile((p.data ?? null) as Profile | null);
      setAchievements((a.data ?? []) as Achievement[]);
      setShows((s.data ?? []) as Show[]);
      setSkills((sk.data ?? []) as Skill[]);
      setReviews((r.data ?? []) as unknown as ReviewLite[]);
      setRating(rate.data ? { avg_rating: rate.data.avg_rating, review_count: rate.data.review_count } : null);
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <main className="p-10 text-center text-ink-subtle">Building your press kit…</main>;
  if (!profile) return <main className="p-10 text-center text-ink-subtle">Could not load your profile.</main>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 print:p-0">
      {/* Print controls — hidden in print output */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={() => router.back()}
          className="text-sm text-ink-muted hover:text-ink-strong"
        >
          ← Back
        </button>
        <button
          onClick={() => window.print()}
          className="rounded-xl bg-ink-strong px-4 py-2 text-sm font-medium text-white"
        >
          Download as PDF
        </button>
      </div>

      {/* PRESS KIT BODY (print-safe) */}
      <article className="bg-surface text-ink-strong print:bg-surface">
        <header className="flex items-center gap-5 border-b border-line pb-6">
          {profile.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.display_name ?? ''}
              className="h-24 w-24 rounded-full object-cover border border-line"
            />
          )}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{profile.display_name}</h1>
            <p className="text-sm text-ink-subtle">@{profile.handle}</p>
            {profile.location && <p className="text-sm text-ink mt-1">{profile.location}</p>}
            {rating && rating.review_count > 0 && (
              <p className="text-sm text-ink mt-1">
                ★ {rating.avg_rating} ({rating.review_count} review{rating.review_count === 1 ? '' : 's'})
              </p>
            )}
          </div>
        </header>

        {profile.bio && (
          <section className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">About</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-strong">{profile.bio}</p>
          </section>
        )}

        {profile.quote && (
          <section className="mt-6">
            <blockquote className="border-l-4 border-line-strong pl-4 italic text-ink">
              “{profile.quote}”
            </blockquote>
          </section>
        )}

        {profile.genres && profile.genres.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Genres</h2>
            <p className="mt-2 text-sm text-ink-strong">{profile.genres.join(' · ')}</p>
          </section>
        )}

        {skills.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Skills</h2>
            <ul className="mt-2 grid grid-cols-2 gap-y-1 text-sm text-ink-strong">
              {skills.map((s) => (
                <li key={s.id}>{s.skill}{s.level ? ` — ${s.level}` : ''}</li>
              ))}
            </ul>
          </section>
        )}

        {achievements.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Highlights</h2>
            <ul className="mt-2 space-y-1 text-sm text-ink-strong">
              {achievements.map((a) => (
                <li key={a.id}>
                  {a.title}{a.year ? ` — ${a.year}` : ''}
                </li>
              ))}
            </ul>
          </section>
        )}

        {shows.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Recent shows</h2>
            <ul className="mt-2 space-y-1 text-sm text-ink-strong">
              {shows.slice(0, 10).map((sh) => (
                <li key={sh.id}>
                  {sh.title}
                  {sh.venue ? ` · ${sh.venue}` : ''}
                  {sh.event_date ? ` · ${new Date(sh.event_date).toLocaleDateString()}` : ''}
                </li>
              ))}
            </ul>
          </section>
        )}

        {reviews.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Reviews</h2>
            <ul className="mt-2 space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="text-sm text-ink-strong">
                  <span className="text-warning">{'★'.repeat(r.rating)}</span>
                  {r.comment && <span className="ml-2 italic">“{r.comment}”</span>}
                  {r.reviewer?.display_name && (
                    <span className="block text-xs text-ink-subtle">— {r.reviewer.display_name}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {profile.links && Object.keys(profile.links).length > 0 && (
          <section className="mt-6 border-t border-line pt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Contact / Links</h2>
            <ul className="mt-2 text-sm text-ink-strong space-y-1">
              {Object.entries(profile.links)
                .filter(([, v]) => !!v)
                .map(([k, v]) => (
                  <li key={k}><span className="text-ink-subtle capitalize">{k}:</span> {v}</li>
                ))}
            </ul>
          </section>
        )}

        <footer className="mt-8 border-t border-line pt-4 text-xs text-ink-subtle">
          Generated by Arteve · arteve.in/{profile.handle}
        </footer>
      </article>

      <style jsx global>{`
        @media print {
          @page { margin: 0.6in; }
          body { background: white !important; }
        }
      `}</style>
    </main>
  );
}
