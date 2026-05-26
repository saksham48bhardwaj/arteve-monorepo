'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@arteve/supabase/client';
import { getMyReviewForBooking, submitReview } from './queries';

type Props = {
  bookingId: string;
  /** The OTHER party — the person being reviewed. */
  revieweeId: string;
  revieweeName: string;
  bookingStatus: string;
  onReviewSubmitted?: () => void;
};

/**
 * Shows a review prompt on completed-booking pages.
 * - If the booking isn't completed, renders nothing.
 * - If the current user has already submitted a review, shows a thank-you.
 * - Otherwise renders a 5-star picker + comment + submit.
 */
export function ReviewPrompt({
  bookingId,
  revieweeId,
  revieweeName,
  bookingStatus,
  onReviewSubmitted,
}: Props) {
  const [me, setMe] = useState<string | null>(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState<boolean | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;
      setMe(uid);
      if (uid && bookingStatus === 'completed') {
        const existing = await getMyReviewForBooking(bookingId, uid);
        setAlreadyReviewed(!!existing);
      } else {
        setAlreadyReviewed(false);
      }
    })();
  }, [bookingId, bookingStatus]);

  if (bookingStatus !== 'completed') return null;
  if (alreadyReviewed === null || !me) return null;

  if (alreadyReviewed) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 border-line">
        <p className="text-sm font-medium text-emerald-900">
          Thanks — your review of {revieweeName} is live on their profile.
        </p>
      </div>
    );
  }

  async function handleSubmit() {
    if (!me) return;
    setSubmitting(true);
    setError(null);
    const { error: e } = await submitReview({
      bookingId,
      reviewerId: me,
      revieweeId,
      rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (e) {
      setError(e);
      return;
    }
    setAlreadyReviewed(true);
    onReviewSubmitted?.();
  }

  return (
    <div className="rounded-2xl border border-line bg-surface px-5 py-5 space-y-4 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-ink-strong">
          How was your experience with {revieweeName}?
        </h3>
        <p className="text-sm text-ink-subtle mt-1">
          Your review is public and helps the rest of the community.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`text-3xl leading-none transition ${
              n <= rating ? 'text-accent-500' : 'text-ink-disabled hover:text-amber-300'
            }`}
            aria-label={`Rate ${n} star${n === 1 ? '' : 's'}`}
          >
            ★
          </button>
        ))}
        <span className="ml-2 text-sm text-ink-muted">{rating}/5</span>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="A short note about your experience (optional)"
        className="h-24 w-full rounded-xl border border-line p-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-xl bg-ink-strong px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Submit review'}
        </button>
      </div>
    </div>
  );
}
