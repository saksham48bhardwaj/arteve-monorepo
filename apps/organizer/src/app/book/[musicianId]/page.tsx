'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';

export default function BookMusician({ params }: { params: Promise<{ musicianId: string }> }) {
  const { musicianId } = use(params);
  const router = useRouter();

  const [event_title, setTitle] = useState('');
  const [event_date, setDate] = useState('');
  const [event_time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayStr = (() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  })();

  async function submit() {
    setError(null);

    if (!event_title.trim()) { setError('Please add an event title.'); return; }
    if (!event_date) { setError('Please pick an event date.'); return; }
    if (event_date < todayStr) { setError('Event date can’t be in the past.'); return; }
    const budgetN = budget.trim() ? Number(budget) : null;
    if (budgetN !== null && (!Number.isFinite(budgetN) || budgetN < 0)) {
      setError('Budget must be a positive number.');
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      router.push('/login');
      return;
    }

    if (user.id === musicianId) {
      setLoading(false);
      setError('You can’t book yourself.');
      return;
    }

    // Use the organizer's display name — never expose the raw email as a name.
    const { data: me } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();
    const organizerName =
      me?.display_name?.trim() || (user.email ? user.email.split('@')[0] : 'Organizer');

    const { error } = await supabase.from('bookings').insert({
      musician_id: musicianId,
      organizer_id: user.id,
      organizer_email: user.email ?? '',
      organizer_name: organizerName,
      event_title: event_title.trim(),
      event_date,
      event_time: event_time || null,
      location: location.trim() || null,
      budget_min: budgetN,
      budget_max: budgetN,
      message: message.trim() || null,
      status: 'pending',
    });

    setLoading(false);

    if (error) {
      console.error(error);
      setError(error.message || 'Failed to send booking request. Please try again.');
      return;
    }

    router.push('/bookings');
  }

  return (
    <main className="w-full max-w-xl mx-auto px-4 md:px-6 py-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-ink-strong">Book musician</h1>
        <p className="text-sm text-ink-muted mt-1">Send a booking request — the musician can accept or decline.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="bk-title" className="label">Event title</label>
        <input id="bk-title" className="input"
          placeholder="e.g. Friday jazz night"
          value={event_title}
          onChange={(e)=>setTitle(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="bk-date" className="label">Event date</label>
          <input id="bk-date" className="input" type="date" min={todayStr}
            value={event_date} onChange={(e)=>setDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="bk-time" className="label">Start time</label>
          <input id="bk-time" className="input" type="time"
            value={event_time} onChange={(e)=>setTime(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="bk-loc" className="label">Location</label>
        <input id="bk-loc" className="input"
          placeholder="Venue, neighbourhood, or city"
          value={location}
          onChange={(e)=>setLocation(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="bk-budget" className="label">Budget ($)</label>
        <input id="bk-budget" className="input" type="number" min={0}
          placeholder="300"
          value={budget}
          onChange={(e)=>setBudget(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="bk-msg" className="label">Message</label>
        <textarea id="bk-msg" className="textarea"
          placeholder="Message to musician…"
          value={message}
          onChange={(e)=>setMessage(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-sm font-medium text-danger">
          {error}
        </div>
      )}

      <button
        onClick={submit}
        disabled={loading}
        className="btn btn-primary btn-lg w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Sending…' : 'Send booking request'}
      </button>
    </main>
  );
}
