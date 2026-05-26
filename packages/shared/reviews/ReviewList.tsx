'use client';

import { useEffect, useState } from 'react';
import { getReviewsForProfile } from './queries';
import type { Review } from './types';

type Props = {
  profileId: string;
  limit?: number;
};

export function ReviewList({ profileId, limit }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await getReviewsForProfile(profileId);
      if (!cancelled) {
        setReviews(limit ? list.slice(0, limit) : list);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId, limit]);

  if (loading) return <div className="text-sm text-ink-subtle">Loading reviews…</div>;
  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong bg-surface-sunken px-4 py-6 text-center text-sm text-ink-subtle">
        No reviews yet. After a completed booking, both parties can leave one.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <li
          key={r.id}
          className="rounded-2xl border border-line bg-surface px-4 py-4"
        >
          <div className="flex items-start gap-3">
            <img
              src={r.reviewer?.avatar_url ?? '/default-avatar.png'}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-ink-strong truncate">
                  {r.reviewer?.display_name ?? 'A guest'}
                </p>
                <span className="text-accent-500 text-sm">
                  {'★'.repeat(r.rating)}
                  <span className="text-ink-disabled">{'☆'.repeat(5 - r.rating)}</span>
                </span>
              </div>
              {r.comment && (
                <p className="mt-1 text-sm text-ink">{r.comment}</p>
              )}
              <p className="mt-1 text-xs text-ink-subtle">
                {new Date(r.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
