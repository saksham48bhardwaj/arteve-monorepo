'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@arteve/supabase/client';
import { sendNotification } from '@arteve/shared/notifications';

type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'canceled_by_organizer'
  | 'canceled_by_musician'
  | 'completed'
  | string;

type Booking = {
  id: string;
  musician_id: string;
  organizer_id: string;
  organizer_name: string | null;
  organizer_email: string | null;
  event_title: string;
  event_date: string;
  location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  message: string | null;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
  event_time: string | null;
};

type MusicianProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  genres: string[] | null;
  location: string | null;
};

export default function OrganizerBookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [musician, setMusician] = useState<MusicianProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // ----------------------------
  // LOAD BOOKING + MUSICIAN SNAPSHOT
  // ----------------------------
  useEffect(() => {
    async function load() {
      setLoading(true);

      // load booking
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .maybeSingle();

      if (error) {
        console.error('Error loading booking:', error);
        setBooking(null);
        setLoading(false);
        return;
      }

      const b = data as Booking;
      setBooking(b);

      // load musician
      const { data: m } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, genres, location')
        .eq('id', b.musician_id)
        .maybeSingle();

      setMusician(m as MusicianProfile);

      setLoading(false);
    }

    load();
  }, [bookingId]);

  // ----------------------------
  // REALTIME UPDATES
  // ----------------------------
  useEffect(() => {
    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` },
        (payload) => {
          setBooking(payload.new as Booking);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  // ----------------------------
  // CANCEL BOOKING
  // ----------------------------
  async function cancelBooking() {
    if (!booking) return;

    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'canceled_by_organizer',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (error) {
      console.error(error);
      return;
    }

    await sendNotification({
      userId: booking.musician_id,
      type: 'booking_status_changed',
      title: 'Booking canceled',
      body: `The organizer canceled the booking "${booking.event_title}".`,
      data: { bookingId, status: 'canceled_by_organizer' },
    });

    router.refresh();
  }

  async function markCompleted() {
    if (!booking) return;

    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (error) {
      console.error(error);
      return;
    }

    await sendNotification({
      userId: booking.musician_id,
      type: 'booking_status_changed',
      title: 'Booking completed',
      body: `The organizer marked the booking "${booking.event_title}" as completed.`,
      data: { bookingId, status: 'completed' },
    });

    router.refresh();
  }

  // ----------------------------
  // RENDER
  // ----------------------------
  if (loading) {
    return <main className="p-6">Loading booking…</main>;
  }

  if (!booking) {
    return <main className="p-6">Booking not found.</main>;
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <button className="text-sm text-gray-600" onClick={() => router.back()}>
        ← Back
      </button>

      <h1 className="text-xl font-semibold">Booking Details</h1>

      {/* MUSICIAN SNAPSHOT */}
      <section className="border rounded-xl p-4 bg-gray-50">
        <div className="flex gap-3">
          <img
            src={musician?.avatar_url ?? '/placeholder-avatar.png'}
            alt={musician?.display_name ?? 'Musician'}
            className="w-14 h-14 rounded-full object-cover border"
          />

          <div className="flex-1">
            <p className="font-medium">
              {musician?.display_name ?? 'Unknown musician'}
            </p>

            {musician?.location && (
              <p className="text-xs text-gray-500">{musician.location}</p>
            )}

            {musician?.genres?.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {musician.genres.map((g) => (
                  <span
                    key={g}
                    className="px-2 py-0.5 rounded-full bg-white border text-[11px] text-gray-700"
                  >
                    {g}
                  </span>
                ))}
              </div>
            ) : null}

            <Link
              href={`/musician/${musician?.id}`}
              className="text-xs underline text-blue-600 mt-2 inline-block"
            >
              View full profile →
            </Link>
          </div>
        </div>
      </section>

      {/* EVENT DETAILS */}
      <section className="border rounded-xl p-4 space-y-2">
        <p className="font-medium text-lg">{booking.event_title}</p>

        <p className="text-sm text-gray-600">
          {booking.event_date &&
            new Date(booking.event_date).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          {booking.event_time && ` · ${booking.event_time}`}
          {booking.location ? ` · ${booking.location}` : ''}
        </p>

        {(booking.budget_min !== null || booking.budget_max !== null) && (
          <p className="text-sm text-gray-600">
            Budget: {booking.budget_min ? `$${booking.budget_min}` : 'TBD'}
            {booking.budget_max ? ` – $${booking.budget_max}` : ''}
          </p>
        )}

        {booking.status && (
          <p className="text-sm text-gray-600">
            Status: <span className="capitalize">{booking.status}</span>
          </p>
        )}

        {booking.message && (
          <p className="text-sm text-gray-700 mt-2 whitespace-pre-line bg-gray-50 rounded-lg px-3 py-2">
            “{booking.message}”
          </p>
        )}
      </section>

      {/* ACTIONS */}
      <div className="space-y-2">
        <button
          onClick={() => router.push(`/bookings/${booking.id}/chat`)}
          className="w-full px-4 py-2 rounded-xl bg-blue-600 text-white text-sm"
        >
          Open chat
        </button>

        {booking.status === 'accepted' && (
          <>
            <button
              onClick={markCompleted}
              className="w-full px-4 py-2 rounded-xl bg-green-600 text-white text-sm"
            >
              Mark as completed
            </button>

            <button
              onClick={cancelBooking}
              className="w-full px-4 py-2 rounded-xl bg-red-600 text-white text-sm"
            >
              Cancel booking
            </button>
          </>
        )}
      </div>
    </main>
  );
}
