'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@arteve/supabase/client';

export default function BookMusician({ params }: { params: { musicianId: string } }) {
  const musicianId = params.musicianId;
  const router = useRouter();

  const [event_title, setTitle] = useState('');
  const [event_date, setDate] = useState('');
  const [event_time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const organizerId = user.id;
    const organizerEmail = user.email ?? '';

    const { error } = await supabase.from('bookings').insert({
      musician_id: musicianId,
      organizer_id: organizerId,
      organizer_email: organizerEmail,
      organizer_name: organizerEmail,
      event_title,
      event_date,
      event_time,
      location,
      budget_min: Number(budget) || null,
      budget_max: Number(budget) || null,
      message,
      status: 'pending'
    });

    setLoading(false);

    if (!error) {
      router.push('/bookings');
    }
  }

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      <h1 className="text-xl font-semibold">Book Musician</h1>

      <input className="w-full border rounded-xl px-3 py-2"
        placeholder="Event Title"
        value={event_title}
        onChange={(e)=>setTitle(e.target.value)}
      />

      <input className="w-full border rounded-xl px-3 py-2"
        type="date" value={event_date} onChange={(e)=>setDate(e.target.value)}
      />

      <input className="w-full border rounded-xl px-3 py-2"
        type="time" value={event_time} onChange={(e)=>setTime(e.target.value)}
      />

      <input className="w-full border rounded-xl px-3 py-2"
        placeholder="Location"
        value={location}
        onChange={(e)=>setLocation(e.target.value)}
      />

      <input className="w-full border rounded-xl px-3 py-2"
        placeholder="Budget (e.g., 300)"
        value={budget}
        onChange={(e)=>setBudget(e.target.value)}
      />

      <textarea className="w-full border rounded-xl px-3 py-2"
        placeholder="Message to musician…"
        value={message}
        onChange={(e)=>setMessage(e.target.value)}
      />

      <button
        onClick={submit}
        disabled={loading}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl"
      >
        {loading ? 'Sending...' : 'Send Booking Request'}
      </button>
    </main>
  );
}
