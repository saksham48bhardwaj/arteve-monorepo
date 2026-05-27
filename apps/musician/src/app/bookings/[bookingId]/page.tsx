'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@arteve/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@arteve/ui/components';
import { sendNotification } from '@arteve/shared/notifications';
import { ReviewPrompt } from '@arteve/shared/reviews';

type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'canceled_by_organizer'
  | 'canceled_by_musician'
  | 'completed'
  | string;

type Booking = {
  id: string;
  organizer_id: string;
  organizer_name: string | null;
  organizer_email: string | null;
  event_title: string | null;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  message: string | null;
  status: BookingStatus;
  updated_at: string | null;
};

type OrganizerProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  genres: string[] | null;
  location: string | null;
};

export default function BookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [organizer, setOrganizer] = useState<OrganizerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ----------------------------
  // LOAD BOOKING + ORGANIZER PROFILE
  // ----------------------------
  useEffect(() => {
    loadBooking();
  }, []);

  async function loadBooking() {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error) {
      console.error(error);
      setError('Unable to load booking.');
      setLoading(false);
      return;
    }

    const b = data as Booking;
    setBooking(b);

    // Organizer profile
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, genres, location')
      .eq('id', b.organizer_id)
      .maybeSingle();

    setOrganizer(prof as OrganizerProfile);
    setLoading(false);
  }

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
  // UPDATE STATUS (accept / decline / cancel)
  // ----------------------------
  async function updateStatus(status: BookingStatus) {
    if (!booking) return;

    setActionLoading(true);

    const { error } = await supabase
      .from('bookings')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (error) {
      console.error(error);
      setError('Failed to update booking.');
      setActionLoading(false);
      return;
    }

    await sendNotification({
      userId: booking.organizer_id,
      type: 'booking_status_changed',
      title:
        status === 'accepted'
          ? 'Your booking was accepted'
          : status === 'declined'
          ? 'Your booking was declined'
          : 'Booking updated',
      body: `The status of your booking "${booking.event_title}" is now ${status}.`,
      data: { bookingId, status },
    });

    setBooking((prev) => (prev ? { ...prev, status } : prev));
    setActionLoading(false);
  }

  async function markCompleted() {
    if (!booking) return;
    setActionLoading(true);

    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (error) {
      console.error(error);
      setError('Failed to mark as completed.');
      setActionLoading(false);
      return;
    }

    await sendNotification({
      userId: booking.organizer_id,
      type: 'booking_status_changed',
      title: 'Event completed',
      body: `The musician marked the booking "${booking.event_title}" as completed.`,
      data: { bookingId, status: 'completed' },
    });

    setBooking((prev) =>
      prev ? { ...prev, status: 'completed' } : prev
    );
    setActionLoading(false);
  }

  // ----------------------------
  // RENDER
  // ----------------------------
  if (loading) return (
    <main className="page page-narrow space-y-3">
      {/* Title + status badge */}
      <div className="space-y-2">
        <Skeleton width="55%" height={22} />
        <Skeleton width="35%" height={14} />
      </div>
      {/* Detail card */}
      <div className="card card-padded space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between gap-3">
            <Skeleton width="30%" height={12} />
            <Skeleton width="40%" height={12} />
          </div>
        ))}
      </div>
      {/* Action row */}
      <div className="flex gap-2">
        <Skeleton className="flex-1" height={40} />
        <Skeleton className="flex-1" height={40} />
      </div>
    </main>
  );
  if (!booking) return <div className="p-6">Booking not found.</div>;

  const isCanceled =
    booking.status === 'canceled_by_organizer' ||
    booking.status === 'canceled_by_musician';

  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      <button className="text-sm text-ink-muted" onClick={() => router.back()}>
        ← Back
      </button>

      <h1 className="text-xl font-semibold">Booking Details</h1>

      {error && (
        <div className="bg-danger/5 text-danger border border-danger/30 p-3 rounded-md">
          {error}
        </div>
      )}

      {/* ORGANIZER SNAPSHOT */}
      <section className="border rounded-xl p-4 bg-surface-sunken border-line">
        <div className="flex gap-3">
          <img
            src={organizer?.avatar_url ?? '/placeholder-avatar.png'}
            alt={organizer?.display_name ?? 'Organizer'}
            className="w-14 h-14 rounded-full object-cover border border-line"
          />

          <div className="flex-1">
            <p className="font-medium">
              {organizer?.display_name || 'Organizer'}
            </p>
            {booking.organizer_email && (
              <p className="text-xs text-ink-subtle">{booking.organizer_email}</p>
            )}
            {organizer?.location && (
              <p className="text-xs text-ink-subtle">{organizer.location}</p>
            )}

            {organizer?.genres?.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {organizer.genres.map((g) => (
                  <span
                    key={g}
                    className="px-2 py-0.5 rounded-full bg-surface border text-[11px] text-ink border-line"
                  >
                    {g}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* EVENT DETAILS */}
      <section className="border rounded-xl p-4 space-y-2 border-line">
        <p className="font-medium text-lg">
          {booking.event_title || 'Untitled event'}
        </p>

        <p className="text-sm text-ink-muted">
          Date: {booking.event_date || 'TBD'}
        </p>

        <p className="text-sm text-ink-muted">
          Time: {booking.event_time || 'TBD'}
        </p>

        <p className="text-sm text-ink-muted">
          Location: {booking.location || 'TBD'}
        </p>

        {(booking.budget_min !== null || booking.budget_max !== null) && (
          <p className="text-sm text-ink-muted">
            Budget: {booking.budget_min ? `$${booking.budget_min}` : 'TBD'}
            {booking.budget_max ? ` – $${booking.budget_max}` : ''}
          </p>
        )}

        {booking.message && (
          <p className="text-sm bg-surface-sunken rounded-lg px-3 py-2 mt-2">
            “{booking.message}”
          </p>
        )}
      </section>

      {/* ACTIONS */}
      <section className="pt-2 space-y-2">
        {booking.status === 'pending' && !isCanceled && (
          <>
            <button
              onClick={() => updateStatus('accepted')}
              disabled={actionLoading}
              className="w-full py-2 bg-green-600 text-white rounded-lg disabled:opacity-60"
            >
              {actionLoading ? 'Updating…' : 'Accept'}
            </button>

            <button
              onClick={() => updateStatus('declined')}
              disabled={actionLoading}
              className="w-full py-2 border border-line-strong rounded-lg disabled:opacity-60"
            >
              Decline
            </button>
          </>
        )}

        {booking.status === 'accepted' && (
          <>
            <button
              onClick={() => router.push(`/bookings/${booking.id}/chat`)}
              className="w-full py-2 bg-brand text-white rounded-lg"
            >
              Open chat →
            </button>

            <button
              onClick={markCompleted}
              disabled={actionLoading}
              className="w-full py-2 bg-blue-700 text-white rounded-lg disabled:opacity-60"
            >
              Mark as completed
            </button>

            <button
              onClick={() => updateStatus('canceled_by_musician')}
              disabled={actionLoading}
              className="w-full py-2 border border-danger/40 text-danger rounded-lg disabled:opacity-60"
            >
              Cancel booking
            </button>
          </>
        )}
      </section>

      {/* REVIEW PROMPT (shows only when booking.status === 'completed') */}
      {booking.status === 'completed' && organizer && (
        <section>
          <ReviewPrompt
            bookingId={booking.id}
            revieweeId={booking.organizer_id}
            revieweeName={organizer.display_name ?? 'the organizer'}
            bookingStatus={booking.status}
          />
        </section>
      )}
    </main>
  );
}
