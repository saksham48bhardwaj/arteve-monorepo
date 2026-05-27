'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import { Button, Input, Textarea, Badge, Spinner } from '@arteve/ui/components';

const MAX_DESC = 1500;

export default function CreateGigPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [genresInput, setGenresInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/login');
    })();
  }, [router]);

  const genres = genresInput
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);

  const canSubmit = title.trim().length > 0 && !loading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setErrorMsg(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMsg('You must be logged in as an organizer.');
      setLoading(false);
      return;
    }

    const minN = budgetMin ? Number(budgetMin) : null;
    const maxN = budgetMax ? Number(budgetMax) : null;
    if (minN && maxN && minN > maxN) {
      setErrorMsg('Min budget cannot exceed max budget.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('gigs').insert({
      organizer_id: user.id,
      created_by: user.id,
      title: title.trim(),
      description: description.trim() || null,
      event_date: eventDate || null,
      event_time: eventTime || null,
      location: location.trim() || null,
      budget_min: minN,
      budget_max: maxN,
      genres: genres.length ? genres : null,
      status: 'open',
    });

    if (error) {
      console.error(error);
      setErrorMsg(error.message || 'Failed to create gig. Please try again.');
      setLoading(false);
      return;
    }

    router.push('/gigs');
  }

  return (
    <main className="w-full mx-auto pb-24" style={{ maxWidth: 720 }}>
      {/* Sticky header (page owns it because TopNav is hidden on this route) */}
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85 px-4 py-3 border-b border-line">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/gigs"
            aria-label="Back"
            className="inline-flex h-9 w-9 -ml-1 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="text-base font-semibold text-ink-strong">New gig</h1>
          <Button size="sm" type="submit" form="gig-form" loading={loading} disabled={!canSubmit}>
            Publish
          </Button>
        </div>
      </header>

      <form id="gig-form" onSubmit={handleSubmit} className="px-4 md:px-6 pt-5 space-y-6">
        {/* INTRO */}
        <div>
          <p className="page-title !text-xl md:!text-2xl">Post a gig</p>
          <p className="page-subtitle">Tell artists what you&apos;re looking for and how to reach you.</p>
        </div>

        {/* THE BASICS */}
        <section>
          <h3 className="eyebrow mb-3">The basics</h3>
          <div className="space-y-4">
            <Input
              label="Gig title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Friday jazz night, wedding cocktail set"
              required
              helper="A clear, specific title gets more applications."
            />
            <div>
              <div className="flex items-end justify-between mb-1.5">
                <label htmlFor="gig-desc" className="label !mb-0">Description</label>
                <span className={`text-[11px] tabular ${description.length > MAX_DESC ? 'text-danger' : 'text-ink-subtle'}`}>
                  {description.length}/{MAX_DESC}
                </span>
              </div>
              <Textarea
                id="gig-desc"
                rows={5}
                maxLength={MAX_DESC}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Style, duration, equipment provided, expectations, what kind of crowd…"
              />
            </div>
          </div>
        </section>

        {/* DATE + LOCATION */}
        <section>
          <h3 className="eyebrow mb-3">When &amp; where</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Event date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
            <Input
              label="Start time"
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              helper="Optional"
            />
          </div>
          <div className="mt-4">
            <Input
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Venue name, neighbourhood, or city"
              leadingIcon={
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-9 8-14a8 8 0 0 0-16 0c0 5 8 14 8 14z" />
                  <circle cx="12" cy="8" r="3" />
                </svg>
              }
            />
          </div>
        </section>

        {/* BUDGET */}
        <section>
          <h3 className="eyebrow mb-3">Budget</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Minimum ($)"
              type="number"
              min={0}
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              placeholder="200"
              leadingIcon={<span className="text-sm font-semibold">$</span>}
            />
            <Input
              label="Maximum ($)"
              type="number"
              min={0}
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              placeholder="500"
              leadingIcon={<span className="text-sm font-semibold">$</span>}
            />
          </div>
          <p className="helper">Sharing a range gets ~3× more applications than &ldquo;negotiable&rdquo;.</p>
        </section>

        {/* GENRES */}
        <section>
          <h3 className="eyebrow mb-3">Genres &amp; vibe</h3>
          <Input
            label="Genres"
            value={genresInput}
            onChange={(e) => setGenresInput(e.target.value)}
            placeholder="rock, jazz, indie pop"
            helper="Separate with commas."
          />
          {genres.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {genres.map((g) => (
                <Badge key={g} tone="brand">{g}</Badge>
              ))}
            </div>
          )}
        </section>

        {/* ERROR */}
        {errorMsg && (
          <div className="rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-sm font-medium text-danger flex items-start gap-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* MOBILE PUBLISH */}
        <div className="md:hidden">
          <Button type="submit" fullWidth size="lg" loading={loading} disabled={!canSubmit}>
            Publish gig
          </Button>
        </div>

        <p className="text-[11px] text-ink-subtle text-center">
          Your gig becomes visible to musicians as soon as you publish.
        </p>
      </form>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-strong/40 backdrop-blur-sm">
          <div className="rounded-xl bg-surface px-5 py-4 shadow-xl flex items-center gap-3">
            <Spinner size={18} />
            <span className="text-sm font-medium text-ink-strong">Publishing…</span>
          </div>
        </div>
      )}
    </main>
  );
}
