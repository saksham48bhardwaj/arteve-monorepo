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
    <main className="mx-auto max-w-3xl p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Edit Gig</h1>
        <p className="text-sm text-gray-500">
          Update gig details and manage its status.
        </p>
      </header>

      {feedback && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-2 rounded-lg">
          {feedback}
        </div>
      )}

      {/* CARD */}
      <form
        onSubmit={handleSave}
        className="bg-white border rounded-2xl p-6 space-y-6 shadow-sm"
      >
        {/* TITLE */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Title</label>
          <input
            className="w-full border rounded-xl px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
          />
        </div>

        {/* DESCRIPTION */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Description</label>
          <textarea
            className="w-full border rounded-xl px-3 py-2 text-sm min-h-[120px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this gig…"
          />
        </div>

        {/* DATE + TIME */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Event date</label>
            <input
              type="date"
              className="w-full border rounded-xl px-3 py-2 text-sm"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Event time</label>
            <input
              type="time"
              className="w-full border rounded-xl px-3 py-2 text-sm"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
            />
          </div>
        </div>

        {/* LOCATION */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Location</label>
          <input
            className="w-full border rounded-xl px-3 py-2 text-sm"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ottawa, Ontario"
          />
        </div>

        {/* BUDGET */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Min budget</label>
            <input
              type="number"
              className="w-full border rounded-xl px-3 py-2 text-sm"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              placeholder="150"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Max budget</label>
            <input
              type="number"
              className="w-full border rounded-xl px-3 py-2 text-sm"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              placeholder="300"
            />
          </div>
        </div>

        {/* GENRES */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Genres</label>
          <input
            className="w-full border rounded-xl px-3 py-2 text-sm"
            value={genres}
            onChange={(e) => setGenres(e.target.value)}
            placeholder="rock, pop, jazz"
          />
        </div>

        {/* STATUS DROPDOWN */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Status</label>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as 'open' | 'closed' | 'booked')
            }
            className="w-full border rounded-xl px-3 py-2 text-sm"
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="booked">Booked</option>
          </select>
        </div>

        {/* SAVE BUTTON */}
        <div>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </main>
  );
}
