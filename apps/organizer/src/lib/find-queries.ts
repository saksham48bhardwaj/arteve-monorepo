'use client';

import { supabase } from '@arteve/supabase/client';

/* -------------------------------------------------------------------------- */
/*                               TYPES (Shared)                                */
/* -------------------------------------------------------------------------- */

export type PersonResult = {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
  genres: string[] | null;
  id?: string;
};

export type PersonFilters = {
  location?: string;
  genre?: string;
};

export const PAGE_SIZE = 20;

function getRange(page: number) {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  return { from, to };
}

/* -------------------------------------------------------------------------- */
/*                                 SEARCH: PEOPLE                             */
/* -------------------------------------------------------------------------- */

export async function searchPeople(
  query: string,
  page = 1,
  filters: PersonFilters = {}
): Promise<PersonResult[]> {
  const { from, to } = getRange(page);

  let q = supabase
    .from('profiles')
    .select('id, handle, display_name, avatar_url, location, genres')
    .eq('role', 'musician')
    .is('deleted_at', null);

  if (query.trim()) {
    q = q.ilike('display_name', `%${query}%`);
  }
  if (filters.location) {
    q = q.ilike('location', `%${filters.location}%`);
  }
  if (filters.genre) {
    q = q.contains('genres', [filters.genre]);
  }

  const { data, error } = await q.range(from, to);

  if (error) throw error;
  return (data ?? []) as PersonResult[];
}
