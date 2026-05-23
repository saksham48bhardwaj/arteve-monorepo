export type ApplicationStatus = 'pending' | 'accepted' | 'declined';

export type Application = {
  id: string;
  gig_id: string;
  musician_id: string;
  organizer_id: string;
  status: ApplicationStatus;
  message: string | null;
  created_at: string;
};
