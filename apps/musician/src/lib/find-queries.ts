'use client';

import { supabase } from '@arteve/supabase/client';

/* ============================================================
   TYPES
   ============================================================ */

export type PersonResult = {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
  genres: string[] | null;
};

export type GigResult = {
  id: string;
  title: string;
  location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  event_date: string | null;
};

export type VenueResult = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
};

export type PostResult = {
  id: number;
  media_url: string;
  caption: string | null;
  created_at: string;
  profile_id: string;
  content?: string | null;
  text?: string | null;
};

export type EventResult = {
  id: string;
  title: string;
  location: string | null;
  date: string | null;
  image_url: string | null;
};

/* ============================================================
   PAGINATION
   ============================================================ */

export const PAGE_SIZE = 20;

function getRange(page: number) {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  return { from, to };
}

/* ============================================================
   PEOPLE SEARCH
   ============================================================ */

export async function searchPeople(
  query: string,
  page = 1
): Promise<PersonResult[]> {
  const { from, to } = getRange(page);

  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
      handle,
      display_name,
      avatar_url,
      location,
      genres
    `
    )
    .eq('role', 'musician')
    .ilike('display_name', `%${query}%`)
    .range(from, to);

  if (error) throw error;

  return (data ?? []) as PersonResult[];
}

/* ============================================================
   GIG SEARCH (with filters)
   ============================================================ */

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
    .select('id, title, location, budget_min, budget_max, event_date')
    .eq('status', 'open')
    .neq('organizer_id', musicianId);

  // Text search
  if (query) {
    q = q.or(
      `title.ilike.%${query}%,location.ilike.%${query}%`
    );
  }

  // Filters
  if (filters.location) q = q.ilike('location', `%${filters.location}%`);
  if (filters.genre) q = q.contains('genres', [filters.genre]);
  if (filters.minBudget) q = q.gte('budget_min', filters.minBudget);
  if (filters.maxBudget) q = q.lte('budget_max', filters.maxBudget);

  const { data, error } = await q.range(from, to);

  if (error) throw error;

  return (data ?? []) as GigResult[];
}

/* ============================================================
   VENUE SEARCH (Organizers)
   ============================================================ */

export async function searchVenues(
  query: string,
  page = 1
): Promise<VenueResult[]> {
  const { from, to } = getRange(page);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, location')
    .eq('role', 'organizer')
    .ilike('display_name', `%${query}%`)
    .range(from, to);

  if (error) throw error;

  return (data ?? []) as VenueResult[];
}

/* ============================================================
   POSTS SEARCH
   (Search caption of ALL posts + bits)
   ============================================================ */

export async function searchPosts(
  query: string,
  page = 1
): Promise<PostResult[]> {
  const { from, to } = getRange(page);

  const { data, error } = await supabase
    .from('posts')
    .select('id, media_url, caption, created_at, profile_id')
    .ilike('caption', `%${query}%`)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return (data ?? []) as PostResult[];
}

/* ============================================================
   EVENTS SEARCH
   ============================================================ */

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
