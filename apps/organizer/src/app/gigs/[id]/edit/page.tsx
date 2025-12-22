'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';
import type { Gig } from '@arteve/shared/types/gig';

export default function EditGigPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [genres, setGenres] = useState('');
  const [status, setStatus] = useState<'open' | 'closed' | 'booked'>('open');

  // Load gig
  useEffect(() => {
    async function load() {
      const { data: g } = await supabase
        .from('gigs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!g) {
        setGig(null);
        setLoading(false);
        return;
      }

      const gig = g as Gig;
      setGig(gig);

      setTitle(gig.title ?? '');
      setDescription(gig.description ?? '');
      setEventDate(gig.event_date ?? '');
      setEventTime(gig.event_time ?? '');
      setLocation(gig.location ?? '');
      setBudgetMin(gig.budget_min?.toString() ?? '');
      setBudgetMax(gig.budget_max?.toString() ?? '');
      setGenres(gig.genres?.join(', ') ?? '');
      setStatus(gig.status);

      setLoading(false);
    }

    load();
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!gig) return;

    setSaving(true);
    setFeedback(null);

    const genresArray =
      genres.trim().length > 0
        ? genres.split(',').map((g) => g.trim()).filter(Boolean)
        : null;

    const { error } = await supabase
      .from('gigs')
      .update({
        title: title.trim() || null,
        description: description.trim() || null,
        event_date: eventDate || null,
        event_time: eventTime || null,
        location: location.trim() || null,
        budget_min: budgetMin ? Number(budgetMin) : null,
        budget_max: budgetMax ? Number(budgetMax) : null,
        genres: genresArray,
        status,
      })
      .eq('id', id);

    if (error) {
      setFeedback('Failed to update gig. Please try again.');
      setSaving(false);
      return;
    }

    router.push(`/gigs/${id}`);
  }

  if (loading) return <main className="p-6">Loading gig…</main>;
  if (!gig) return <main className="p-6">Gig not found.</main>;

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      {/* PAGE HEADER */}
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[#4E7FA2]">
          Organizer · Gigs
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Edit Gig
        </h1>
        <p className="text-slate-500 max-w-xl">
          Update gig details, budget, and availability. Changes will be visible to musicians immediately.
        </p>
      </header>

      {feedback && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {feedback}
        </div>
      )}

      {/* MAIN CARD */}
      <form
        onSubmit={handleSave}
        className="relative rounded-3xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.06)] p-6 sm:p-7 space-y-6"
      >
        {/* TITLE */}
        <div className="space-y-1.5">
          <label className="font-medium text-slate-800">Gig title</label>
          <input
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#4E7FA2] focus:bg-white focus:ring-1 focus:ring-[#4E7FA2]/40"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Wedding reception, club night, studio session…"
          />
        </div>

        {/* DESCRIPTION */}
        <div className="space-y-1.5">
          <label className="font-medium text-slate-800">Description</label>
          <textarea
            className="w-full min-h-[120px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#4E7FA2] focus:bg-white focus:ring-1 focus:ring-[#4E7FA2]/40"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the gig, expectations, duration, setup, etc."
          />
        </div>

        {/* DATE + TIME */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-medium text-slate-800">Event date</label>
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#4E7FA2] focus:bg-white focus:ring-1 focus:ring-[#4E7FA2]/40"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-slate-800">Event time</label>
            <input
              type="time"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#4E7FA2] focus:bg-white focus:ring-1 focus:ring-[#4E7FA2]/40"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
            />
          </div>
        </div>

        {/* LOCATION */}
        <div className="space-y-1.5">
          <label className="font-medium text-slate-800">Location</label>
          <input
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#4E7FA2] focus:bg-white focus:ring-1 focus:ring-[#4E7FA2]/40"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Venue name or address"
          />
        </div>

        {/* BUDGET */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-medium text-slate-800">Min budget</label>
            <input
              type="number"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#4E7FA2] focus:bg-white focus:ring-1 focus:ring-[#4E7FA2]/40"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-slate-800">Max budget</label>
            <input
              type="number"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#4E7FA2] focus:bg-white focus:ring-1 focus:ring-[#4E7FA2]/40"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
            />
          </div>
        </div>

        {/* GENRES */}
        <div className="space-y-1.5">
          <label className="font-medium text-slate-800">Genres</label>
          <input
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#4E7FA2] focus:bg-white focus:ring-1 focus:ring-[#4E7FA2]/40"
            value={genres}
            onChange={(e) => setGenres(e.target.value)}
            placeholder="rock, pop, jazz"
          />
        </div>

        {/* STATUS */}
        <div className="space-y-1.5">
          <label className="font-medium text-slate-800">Status</label>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as 'open' | 'closed' | 'booked')
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#4E7FA2] focus:bg-white focus:ring-1 focus:ring-[#4E7FA2]/40"
          >
            <option value="open">Open — accepting artists</option>
            <option value="booked">Booked — artist confirmed</option>
            <option value="closed">Closed — no longer accepting</option>
          </select>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-wrap gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#4E7FA2] text-white font-medium shadow-sm hover:bg-[#406985] disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
