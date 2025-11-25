export type Gig = {
  id: string;
  organizer_id: string;
  title: string | null;
  description: string | null;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  genres: string[] | null;
  budget_min: number | null;
  budget_max: number | null;
  status: 'open' | 'closed' | 'booked';
};
