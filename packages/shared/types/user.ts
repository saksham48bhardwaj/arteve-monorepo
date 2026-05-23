export type UserRole = 'musician' | 'organizer';

export type Profile = {
  id: string;
  role: UserRole | null;
  display_name: string | null;
  handle: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  genres: string[] | null;
  links: Record<string, string> | null;
  venue_photos: string[] | null;
  created_at: string;
};
