'use client';

import { useEffect, useState } from 'react';
import { getProfileRating } from './queries';
import type { ProfileRating } from './types';

type Props = {
  profileId: string;
  /** Render as a small inline pill (used in cards) or larger block. */
  variant?: 'inline' | 'block';
  /** Pre-fetched rating to skip the query. */
  initial?: ProfileRating | null;
};

export function RatingDisplay({ profileId, variant = 'inline', initial = null }: Props) {
  const [rating, setRating] = useState<ProfileRating | null>(initial);
  const [loading, setLoading] = useState(initial === null);

  useEffect(() => {
    if (initial !== null) return;
    let cancelled = false;
    (async () => {
      const r = await getProfileRating(profileId);
      if (!cancelled) {
        setRating(r);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId, initial]);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-ink-subtle">
        ☆ —
      </span>
    );
  }

  if (!rating || rating.review_count === 0) {
    return variant === 'block' ? (
      <div className="text-sm text-ink-subtle">No reviews yet</div>
    ) : (
      <span className="text-xs text-ink-subtle">No reviews</span>
    );
  }

  const stars = Math.round(rating.avg_rating);
  const filled = '★'.repeat(stars);
  const empty = '☆'.repeat(5 - stars);

  if (variant === 'block') {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="text-accent-500 text-lg leading-none">{filled}<span className="text-ink-disabled">{empty}</span></span>
        <span className="text-sm font-medium text-ink-strong">{rating.avg_rating}</span>
        <span className="text-xs text-ink-subtle">({rating.review_count} review{rating.review_count === 1 ? '' : 's'})</span>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink">
      <span className="text-accent-500">★</span>
      <span className="font-medium">{rating.avg_rating}</span>
      <span className="text-ink-subtle">({rating.review_count})</span>
    </span>
  );
}
