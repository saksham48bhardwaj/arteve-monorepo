'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '@arteve/supabase/client';
import { useRouter } from 'next/navigation';

export default function CreateGigPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState<string>('');
  const [eventTime, setEventTime] = useState<string>('');
  const [location, setLocation] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [genres, setGenres] = useState(''); // comma separated
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setFeedback('You must be logged in as an organizer.');
      setLoading(false);
      return;
    }

    const genresArray =
      genres.trim().length > 0
        ? genres
            .split(',')
            .map((g) => g.trim())
            .filter(Boolean)
        : null;

    const { error } = await supabase.from('gigs').insert({
      organizer_id: user.id, // FK to profiles
      created_by: user.id, // convenience / backwards compatibility
      title: title.trim() || 'Untitled gig',
      description: description.trim() || null,
      event_date: eventDate || null,
      event_time: eventTime || null,
      location: location.trim() || null,
      budget_min: budgetMin ? Number(budgetMin) : null,
      budget_max: budgetMax ? Number(budgetMax) : null,
      genres: genresArray,
      status: 'open', // default matches your check constraint
    });

    if (error) {
      console.error(error);
      setFeedback('Failed to create gig. Please try again.');
    } else {
      router.push('/gigs');
    }

    setLoading(false);
  }

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      <h1 className="text-xl font-semibold mb-4">Create a Gig</h1>

      {feedback && (
        <div className="mb-4 text-sm text-gray-700 whitespace-pre-line">
          {feedback}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Gig title</label>
          <input
            className="w-full border rounded-xl px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Wedding reception, club night, studio session…"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            className="w-full border rounded-xl px-3 py-2 min-h-[120px] text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Share gig details, expectations, duration, etc."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Event date
            </label>
            <input
              type="date"
              className="w-full border rounded-xl px-3 py-2"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Event time (optional)
            </label>
            <input
              type="time"
              className="w-full border rounded-xl px-3 py-2"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input
            className="w-full border rounded-xl px-3 py-2"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City / venue"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Min budget (optional)
            </label>
            <input
              type="number"
              className="w-full border rounded-xl px-3 py-2"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Max budget (optional)
            </label>
            <input
              type="number"
              className="w-full border rounded-xl px-3 py-2"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Genres (optional)
          </label>
          <input
            className="w-full border rounded-xl px-3 py-2 text-sm"
            value={genres}
            onChange={(e) => setGenres(e.target.value)}
            placeholder="rock, pop, jazz"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm disabled:opacity-60"
        >
          {loading ? 'Creating…' : 'Create gig'}
        </button>
      </form>
    </main>
  );
}
