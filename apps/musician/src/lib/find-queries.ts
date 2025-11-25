import { supabase } from '@arteve/supabase/client';

/* -------------------- TYPES -------------------- */
export type PersonResult = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  username?: string;
  is_verified?: boolean;
};

export type GigResult = {
  id: string;
  title: string;
  genre?: string;
  location?: string;
  budget_min?: number | null;
  budget_max?: number | null;
  event_date?: string;
};

export type VenueResult = {
  id: string;
  venue_name?: string;
  name?: string;
  location?: string;
  avatar_url?: string | null;
};

export type PostResult = {
  id: string;
  content?: string;
  text?: string;
  created_at?: string;
};

export type EventResult = {
  id: string;
  title: string;
  location?: string;
  date?: string;
  image_url?: string | null;
};

/* -------------------- Pagination Utils -------------------- */
export const PAGE_SIZE = 20;

function getRange(page: number) {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  return { from, to };
}

/* -------------------- PEOPLE SEARCH -------------------- */
export async function searchPeople(
  query: string,
  page = 1
): Promise<PersonResult[]> {
  const { from, to } = getRange(page);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, username, is_verified')
    .eq('role', 'musician')
    .ilike('full_name', `%${query}%`)
    .range(from, to);

  if (error) throw error;
  return (data ?? []) as PersonResult[];
}

/* -------------------- GIG SEARCH (with filters) -------------------- */
export type GigFilters = {
  location?: string;
  genre?: string;
  minBudget?: number | null;
  maxBudget?: number | null;
};

export async function searchGigs(
  query: string,
  musicianId: string,
  filters: GigFilters = {},
  page = 1
): Promise<GigResult[]> {
  const { from, to } = getRange(page);

  let q = supabase
    .from('gigs')
    .select('id, title, genres, location, budget_min, budget_max, event_date')
    .eq('status', 'open')
    .neq('organizer_id', musicianId); // avoid gigs created by this user (if they are also an organizer)

  // Text search in several fields
  if (query) {
    q = q.or(
      `title.ilike.%${query}%,location.ilike.%${query}%,genres.cs.{${query}}`
    );
  }

  // Filters
  if (filters.genre) {
    // genres is text[] - use the "contains" operator
    q = q.contains('genres', [filters.genre]);
  }
  if (filters.location) q = q.ilike('location', `%${filters.location}%`);
  if (filters.minBudget != null) q = q.gte('budget_min', filters.minBudget);
  if (filters.maxBudget != null) q = q.lte('budget_max', filters.maxBudget);

  const { data, error } = await q.range(from, to);

  if (error) throw error;
  return (data ?? []) as GigResult[];
}

/* -------------------- VENUE SEARCH -------------------- */
export async function searchVenues(
  query: string,
  page = 1
): Promise<VenueResult[]> {
  const { from, to } = getRange(page);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, venue_name, full_name:name, location, avatar_url')
    .eq('role', 'organizer')
    .eq('is_venue', true)
    .or(
      `venue_name.ilike.%${query}%,full_name.ilike.%${query}%,location.ilike.%${query}%`
    )
    .range(from, to);

  if (error) throw error;
  return (data ?? []) as VenueResult[];
}

/* -------------------- POSTS SEARCH -------------------- */
export async function searchPosts(
  query: string,
  page = 1
): Promise<PostResult[]> {
  const { from, to } = getRange(page);

  const { data, error } = await supabase
    .from('bits')
    .select('id, content, created_at')
    .ilike('content', `%${query}%`)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return (data ?? []) as PostResult[];
}

/* -------------------- EVENTS SEARCH -------------------- */
export async function searchEvents(
  query: string,
  page = 1
): Promise<EventResult[]> {
  const { from, to } = getRange(page);

  const { data, error } = await supabase
    .from('events')
    .select('id, title, location, date, image_url')
    .or(`title.ilike.%${query}%,location.ilike.%${query}%`)
    .order('date', { ascending: true })
    .range(from, to);

  if (error) throw error;
  return (data ?? []) as EventResult[];
}
