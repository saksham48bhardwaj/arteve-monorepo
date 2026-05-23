export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export type Booking = {
  id: string;
  gig_id: string | null;
  musician_id: string;
  organizer_id: string;
  status: BookingStatus;
  event_title: string | null;
  event_date: string | null;
  venue: string | null;
  pay: number | null;
  notes: string | null;
  created_at: string;
};
