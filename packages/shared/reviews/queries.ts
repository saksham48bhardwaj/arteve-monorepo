import { supabase } from '@arteve/supabase/client';
import type { ProfileRating, Review } from './types';

/** Average rating + count for one profile (returns null if no reviews yet). */
export async function getProfileRating(profileId: string): Promise<ProfileRating | null> {
  const { data, error } = await supabase
    .from('profile_ratings')
    .select('profile_id, avg_rating, review_count')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProfileRating;
}

/** All reviews about a profile, newest first, with reviewer info joined. */
export async function getReviewsForProfile(profileId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(
      `id, booking_id, reviewer_id, reviewee_id, rating, comment, created_at,
       reviewer:profiles!reviewer_id ( id, display_name, avatar_url, handle )`
    )
    .eq('reviewee_id', profileId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as unknown as Review[];
}

/** Has the current user already reviewed this booking? */
export async function getMyReviewForBooking(
  bookingId: string,
  reviewerId: string
): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('reviewer_id', reviewerId)
    .maybeSingle();
  if (error || !data) return null;
  return data as Review;
}

/** Submit a review. RLS enforces participant + completed-booking checks. */
export async function submitReview(params: {
  bookingId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment?: string | null;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('reviews').insert({
    booking_id: params.bookingId,
    reviewer_id: params.reviewerId,
    reviewee_id: params.revieweeId,
    rating: params.rating,
    comment: params.comment ?? null,
  });
  return { error: error?.message ?? null };
}
