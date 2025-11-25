'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@arteve/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { sendNotification } from '@arteve/shared/notifications';

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

export default function BookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ----------------------------
  // LOAD BOOKING
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
    } else {
      setBooking(data as Booking);
    }

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
  // UPDATE STATUS (accept/decline/cancel)
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

    setBooking((prev) => (prev ? { ...prev, status: 'completed' } : prev));
    setActionLoading(false);
  }

  // ----------------------------
  // RENDER
  // ----------------------------
  if (loading) return <div className="p-6">Loading booking…</div>;
  if (!booking) return <div className="p-6">Booking not found.</div>;

  const isCanceled =
    booking.status === 'canceled_by_organizer' ||
    booking.status === 'canceled_by_musician';

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <button className="text-sm text-gray-600" onClick={() => router.back()}>
        ← Back
      </button>

      <h1 className="text-xl font-semibold">Booking Details</h1>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-md">
          {error}
        </div>
      )}

      <section className="border rounded-xl p-4 space-y-2">
        <p className="text-sm text-gray-500">
          From {booking.organizer_name || booking.organizer_email}
        </p>

        <p className="font-medium">{booking.event_title || 'Untitled event'}</p>

        <p className="text-sm text-gray-600">
          Date: {booking.event_date || 'TBD'}
        </p>

        <p className="text-sm text-gray-600">
          Time: {booking.event_time || 'TBD'}
        </p>

        <p className="text-sm text-gray-600">Location: {booking.location}</p>

        {(booking.budget_min || booking.budget_max) && (
          <p className="text-sm text-gray-600">
            Budget: {booking.budget_min ? `$${booking.budget_min}` : 'TBD'}
            {booking.budget_max ? ` – $${booking.budget_max}` : ''}
          </p>
        )}

        {booking.message && (
          <p className="text-sm bg-gray-50 rounded-lg px-3 py-2">
            “{booking.message}”
          </p>
        )}

        <div className="pt-4 flex gap-2">
          {booking.status === 'pending' && !isCanceled && (
            <>
              <button
                onClick={() => updateStatus('accepted')}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-60"
              >
                {actionLoading ? 'Updating…' : 'Accept'}
              </button>

              <button
                onClick={() => updateStatus('declined')}
                disabled={actionLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-60"
              >
                Decline
              </button>
            </>
          )}

          {booking.status === 'accepted' && (
            <>
              <button
                onClick={() => updateStatus('canceled_by_musician')}
                disabled={actionLoading}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg disabled:opacity-60"
              >
                Cancel booking
              </button>

              <button
                onClick={() => router.push(`/bookings/${booking.id}/chat`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Open chat →
              </button>
            </>
          )}
          {booking.status === 'accepted' && (
            <button
              onClick={markCompleted}
              disabled={actionLoading}
              className="px-4 py-2 bg-blue-700 text-white rounded-lg disabled:opacity-60"
            >
              Mark as completed
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
